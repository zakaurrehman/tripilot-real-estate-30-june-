// backend/src/controllers/automateController.js - COMPLETE UPDATED VERSION

const openaiService = require('../services/openaiService');
const pdfGenerator = require('../services/pdfGenerator');
const db = require('../config/database');
const { trackLapisUsage } = require('../utils/lapisTracker');
const { sendEmail } = require('../utils/emailService');
const { WORK_ITEM_COSTS } = require('../shared/types');

class AutomateController {
  async generateRenovationROI(req, res) {
    try {
      const { documentIds, targetROI = 15, budgetCap = 100000 } = req.body;
      const userId = req.user.id;

      if (!documentIds || documentIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Document IDs are required'
        });
      }

      // Get property data
      const documents = await db.document.findMany({
        where: {
          id: { in: documentIds },
          userId
        }
      });

      if (documents.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'No documents found' 
        });
      }

      // Merge property data from multiple documents
      const propertyData = this.mergePropertyData(documents);

      // Generate rehab scope using AI
      const inspectionNotes = documents
        .filter(d => d.type === 'inspection')
        .map(d => d.extractedFields?.notes || '')
        .join('\n');

      let aiRecommendations;
      try {
        aiRecommendations = await openaiService.generateRehabScope(
          propertyData,
          inspectionNotes
        );
      } catch (aiError) {
        console.error('AI recommendation failed:', aiError);
        // Fallback to basic recommendations
        aiRecommendations = this.generateBasicRehabScope(propertyData);
      }

      // Build detailed rehab scope
      const rehabScope = await this.buildRehabScope(
        propertyData,
        aiRecommendations,
        budgetCap
      );

      // Calculate ROI
      const roi = this.calculateROI(propertyData, rehabScope);
      rehabScope.projectedROI = roi;

      // Generate PDF report
      let downloadUrl = null;
      try {
        const { filename, filepath } = await pdfGenerator.generateRehabScopePDF(
          rehabScope,
          propertyData
        );
        downloadUrl = `/api/download/${filename}`;
      } catch (pdfError) {
        console.error('PDF generation failed:', pdfError);
        // Continue without PDF
      }

      // Save to database
      const savedScope = await db.rehabScope.create({
        data: {
          propertyId: documentIds[0], // Primary document
          userId,
          scope: rehabScope,
          targetROI,
          budgetCap,
          pdfPath: downloadUrl
        }
      });

      // Track Lapis usage
      await trackLapisUsage(userId, 'automate', 8);

      res.json({
        success: true,
        rehabScope,
        roi,
        downloadUrl,
        scopeId: savedScope.id,
        message: 'Renovation ROI analysis completed successfully'
      });
    } catch (error) {
      console.error('Renovation ROI error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to generate renovation ROI',
        details: error.message 
      });
    }
  }

  async executeGCMatch(req, res) {
    try {
      const { scopeId, startDate, zipCode } = req.body;
      const userId = req.user.id;

      if (!scopeId || !startDate || !zipCode) {
        return res.status(400).json({
          success: false,
          error: 'Scope ID, start date, and ZIP code are required'
        });
      }

      // Get rehab scope
      const rehabScope = await db.rehabScope.findFirst({
        where: { id: scopeId, userId }
      });

      if (!rehabScope) {
        return res.status(404).json({ 
          success: false,
          error: 'Rehab scope not found' 
        });
      }

      // Get contractors from database or mock data
      const contractors = await this.getMatchingContractors(
        rehabScope.scope,
        zipCode
      );

      // Score and rank contractors
      const rankedContractors = this.rankContractors(
        contractors,
        rehabScope.scope,
        startDate
      );

      // Send RFPs to top 3 contractors
      const rfpResults = await this.sendRFPs(
        rankedContractors.slice(0, 3),
        rehabScope.scope,
        startDate
      );

      // Save match results
      const gcMatch = await db.gcMatch.create({
        data: {
          rehabScopeId: scopeId,
          userId,
          contractors: rankedContractors,
          rfpsSent: rfpResults,
          matchDate: new Date()
        }
      });

      res.json({
        success: true,
        matchedContractors: rankedContractors.slice(0, 3),
        rfpResults,
        matchId: gcMatch.id,
        message: `Successfully matched ${rankedContractors.length} contractors and sent ${rfpResults.length} RFPs`
      });
    } catch (error) {
      console.error('GC Match error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to match contractors',
        details: error.message 
      });
    }
  }

  generateBasicRehabScope(propertyData) {
    // Fallback rehab scope when AI fails
    const recommendedWorkItems = [];
    
    if (propertyData.yearBuilt && propertyData.yearBuilt < 1990) {
      recommendedWorkItems.push({
        workType: 'Interior Paint',
        quantity: propertyData.squareFootage || 1500,
        unit: 'sf',
        reason: 'Older property needs interior refresh'
      });
    }
    
    if (propertyData.roofAge && propertyData.roofAge > 15) {
      recommendedWorkItems.push({
        workType: 'Roof',
        quantity: propertyData.squareFootage || 1500,
        unit: 'sf',
        reason: 'Roof replacement due to age'
      });
    }

    return {
      recommendedWorkItems,
      estimatedTimeline: 30,
      keyConsiderations: ['Property condition assessment needed', 'Local permits required']
    };
  }

  mergePropertyData(documents) {
    const merged = {};
    
    // Priority order: inspection > mls > deed
    const priorityDocs = documents.sort((a, b) => {
      const priority = { inspection: 3, mls: 2, deed: 1 };
      return (priority[b.type] || 0) - (priority[a.type] || 0);
    });

    priorityDocs.forEach(doc => {
      if (doc.extractedFields) {
        Object.entries(doc.extractedFields).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== 'N/A') {
            merged[key] = merged[key] || value;
          }
        });
      }
    });

    return merged;
  }

  async buildRehabScope(propertyData, aiRecommendations, budgetCap) {
    const items = [];
    let totalCost = 0;

    // Process AI recommendations
    if (aiRecommendations.recommendedWorkItems) {
      for (const recommendation of aiRecommendations.recommendedWorkItems) {
        const workType = recommendation.workType;
        const workItemConfig = WORK_ITEM_COSTS[workType];
        
        if (workItemConfig) {
          const quantity = recommendation.quantity || 
            (workItemConfig.unit === 'sf' ? propertyData.squareFootage : 1);
          
          const itemCost = workItemConfig.cost * quantity;
          
          // Check budget constraint
          if (totalCost + itemCost <= budgetCap * 0.9) { // Leave room for contingency
            items.push({
              workType,
              unitCost: workItemConfig.cost,
              quantity,
              unit: workItemConfig.unit,
              totalCost: itemCost,
              notes: recommendation.reason
            });
            totalCost += itemCost;
          }
        }
      }
    }

    const contingencyPercent = 10;
    const permitFees = Math.max(500, totalCost * 0.03); // 3% or minimum $500
    const finalTotal = totalCost * (1 + contingencyPercent / 100) + permitFees;

    return {
      propertyId: propertyData.id,
      propertySize: propertyData.squareFootage,
      items,
      contingencyPercent,
      permitFees,
      totalCost: finalTotal,
      timeline: aiRecommendations.estimatedTimeline || this.estimateTimeline(items)
    };
  }

  calculateROI(propertyData, rehabScope) {
    const purchasePrice = propertyData.listingPrice || 0;
    const rehabCost = rehabScope.totalCost;
    const totalInvestment = purchasePrice + rehabCost;
    const arv = propertyData.estimatedARV || purchasePrice * 1.3; // Default 30% appreciation
    
    const profit = arv - totalInvestment;
    const roi = totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0;
    
    return Math.round(roi * 10) / 10; // Round to 1 decimal
  }

  estimateTimeline(items) {
    // Simple timeline estimation based on work items
    const baseTimeline = {
      'Roof': 7,
      'Kitchen': 21,
      'Bath': 14,
      'Flooring': 7,
      'Interior Paint': 5,
      'Exterior Paint': 7,
      'Windows': 3,
      'HVAC': 5,
      'Electrical Re-wire': 10,
      'Plumbing': 10,
      'Landscaping': 5
    };

    let maxDays = 0;
    let totalDays = 0;

    items.forEach(item => {
      const days = baseTimeline[item.workType] || 5;
      maxDays = Math.max(maxDays, days);
      totalDays += days;
    });

    // Assume some work can be done in parallel
    return Math.max(maxDays, Math.ceil(totalDays * 0.6));
  }

  async getMatchingContractors(rehabScope, zipCode) {
    // In production, this would query a real contractor database
    // For now, return mock data
    const mockContractors = [
      {
        id: 'gc-001',
        name: 'Premier Construction LLC',
        email: 'contact@premierconstruction.com',
        phone: '555-0101',
        specialties: ['Kitchen', 'Bath', 'Flooring'],
        rating: 4.8,
        availability: true,
        priceRange: 'medium',
        location: zipCode
      },
      {
        id: 'gc-002',
        name: 'Quality Builders Inc',
        email: 'info@qualitybuilders.com',
        phone: '555-0102',
        specialties: ['Roof', 'HVAC', 'Electrical Re-wire'],
        rating: 4.5,
        availability: true,
        priceRange: 'high',
        location: zipCode
      },
      {
        id: 'gc-003',
        name: 'HomeReno Experts',
        email: 'projects@homereno.com',
        phone: '555-0103',
        specialties: ['Kitchen', 'Interior Paint', 'Exterior Paint'],
        rating: 4.2,
        availability: true,
        priceRange: 'low',
        location: zipCode
      },
      {
        id: 'gc-004',
        name: 'Total Home Solutions',
        email: 'bids@totalhomesolutions.com',
        phone: '555-0104',
        specialties: ['Plumbing', 'Electrical Re-wire', 'HVAC'],
        rating: 4.6,
        availability: true,
        priceRange: 'medium',
        location: zipCode
      }
    ];

    return mockContractors;
  }

  rankContractors(contractors, rehabScope, startDate) {
    return contractors.map(contractor => {
      let score = contractor.rating * 20; // Base score from rating

      // Match specialties
      const workTypes = rehabScope.items.map(item => item.workType);
      const matchedSpecialties = contractor.specialties.filter(
        specialty => workTypes.includes(specialty)
      );
      score += matchedSpecialties.length * 10;

      // Price range preference (medium is optimal)
      if (contractor.priceRange === 'medium') score += 10;
      else if (contractor.priceRange === 'low') score += 5;

      // Availability bonus
      if (contractor.availability) score += 15;

      return {
        ...contractor,
        matchScore: score,
        matchedSpecialties,
        estimatedCost: this.estimateContractorCost(contractor, rehabScope)
      };
    }).sort((a, b) => b.matchScore - a.matchScore);
  }

  estimateContractorCost(contractor, rehabScope) {
    const baseTotal = rehabScope.totalCost;
    const multiplier = {
      low: 0.85,
      medium: 1.0,
      high: 1.15
    };
    return Math.round(baseTotal * (multiplier[contractor.priceRange] || 1));
  }
async sendRFPs(contractors, rehabScope, startDate) {
    const results = [];

    for (const contractor of contractors) {
      try {
        const emailContent = this.generateRFPEmail(contractor, rehabScope, startDate);
        
        // In production, use real email service
        await sendEmail({
          to: contractor.email,
          subject: emailContent.subject,
          html: emailContent.html
        });

        results.push({
          contractorId: contractor.id,
          contractorName: contractor.name,
          email: contractor.email,
          status: 'sent',
          sentAt: new Date()
        });
      } catch (error) {
        console.error(`Failed to send RFP to ${contractor.name}:`, error);
        results.push({
          contractorId: contractor.id,
          contractorName: contractor.name,
          email: contractor.email,
          status: 'failed',
          error: error.message
        });
      }
    }

    return results;
  }

  generateRFPEmail(contractor, rehabScope, startDate) {
    const workItemsList = rehabScope.items
      .map(item => `- ${item.workType}: ${item.quantity} ${item.unit}`)
      .join('\n');

    const subject = 'Request for Proposal - Residential Renovation Project';
    
    const html = `
      <h2>Request for Proposal</h2>
      <p>Dear ${contractor.name},</p>
      <p>We are seeking bids for a residential renovation project with the following scope:</p>
      
      <h3>Project Details:</h3>
      <ul>
        <li><strong>Property Size:</strong> ${rehabScope.propertySize} sq ft</li>
        <li><strong>Desired Start Date:</strong> ${new Date(startDate).toLocaleDateString()}</li>
        <li><strong>Estimated Timeline:</strong> ${rehabScope.timeline} days</li>
      </ul>

      <h3>Scope of Work:</h3>
      <pre>${workItemsList}</pre>

      <h3>Budget Range:</h3>
      <p>Total project budget: $${rehabScope.totalCost.toLocaleString()} (including contingency)</p>

      <p>Please provide your detailed bid including:</p>
      <ul>
        <li>Line-item pricing for each work item</li>
        <li>Proposed timeline and schedule</li>
        <li>References from similar projects</li>
        <li>Insurance and licensing information</li>
      </ul>

      <p>Please submit your proposal within 5 business days.</p>

      <p>Best regards,<br>TriPilot Real Estate Team</p>
    `;

    return { subject, html };
  }

  async downloadReport(req, res) {
    try {
      const { filename } = req.params;
      const userId = req.user.id;

      if (!filename) {
        return res.status(400).json({
          success: false,
          error: 'Filename is required'
        });
      }

      // Verify user has access to this file
      const rehabScope = await db.rehabScope.findFirst({
        where: {
          userId,
          pdfPath: { contains: filename }
        }
      });

      if (!rehabScope) {
        return res.status(404).json({ 
          success: false,
          error: 'Report not found or access denied' 
        });
      }

      const path = require('path');
      const fs = require('fs');
      const filepath = path.join(__dirname, '../../outputs', filename);
      
      // Check if file exists
      if (!fs.existsSync(filepath)) {
        return res.status(404).json({
          success: false,
          error: 'Report file not found on server'
        });
      }

      res.download(filepath, (err) => {
        if (err) {
          console.error('Download error:', err);
          res.status(500).json({
            success: false,
            error: 'Failed to download report'
          });
        }
      });
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to download report',
        details: error.message 
      });
    }
  }

  async getRehabHistory(req, res) {
    try {
      const userId = req.user.id;
      const { propertyId } = req.query;

      const where = { userId };
      if (propertyId) {
        where.propertyId = propertyId;
      }

      const history = await db.rehabScope.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          gcMatches: true
        }
      });

      const formattedHistory = history.map(h => ({
        id: h.id,
        propertyId: h.propertyId,
        createdAt: h.createdAt,
        totalCost: h.scope?.totalCost || 0,
        roi: h.scope?.projectedROI || 0,
        timeline: h.scope?.timeline || 0,
        contractorsContacted: h.gcMatches?.length || 0,
        status: h.scope ? 'completed' : 'pending'
      }));

      res.json({
        success: true,
        history: formattedHistory,
        total: history.length
      });
    } catch (error) {
      console.error('History error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to retrieve history',
        details: error.message 
      });
    }
  }
}

module.exports = new AutomateController();
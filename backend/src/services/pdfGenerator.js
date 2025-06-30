// backend/src/services/pdfGenerator.js

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, '../../outputs');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generateRehabScopePDF(rehabScope, propertyData) {
    const doc = new PDFDocument({ margin: 50 });
    const filename = `rehab-scope-${propertyData.address.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.pdf`;
    const filepath = path.join(this.outputDir, filename);
    
    doc.pipe(fs.createWriteStream(filepath));

    // Header
    doc.fontSize(24).text('Rehabilitation Scope & ROI Analysis', { align: 'center' });
    doc.moveDown();
    
    // Property Info
    doc.fontSize(18).text('Property Information', { underline: true });
    doc.fontSize(12);
    doc.text(`Address: ${propertyData.address}`);
    doc.text(`Square Footage: ${propertyData.squareFootage} sq ft`);
    doc.text(`Beds/Baths: ${propertyData.beds} beds, ${propertyData.baths} baths`);
    doc.text(`Year Built: ${propertyData.yearBuilt}`);
    doc.moveDown();

    // Rehab Scope Details
    doc.fontSize(18).text('Recommended Rehabilitation Scope', { underline: true });
    doc.fontSize(12);
    
    let subtotal = 0;
    rehabScope.items.forEach((item, index) => {
      doc.text(`${index + 1}. ${item.workType}`);
      doc.text(`   Quantity: ${item.quantity} ${item.unit}`);
      doc.text(`   Unit Cost: $${item.unitCost}/${item.unit}`);
      doc.text(`   Total: $${item.totalCost.toLocaleString()}`);
      if (item.notes) {
        doc.text(`   Notes: ${item.notes}`);
      }
      doc.moveDown(0.5);
      subtotal += item.totalCost;
    });

    // Cost Summary
    doc.addPage();
    doc.fontSize(18).text('Cost Summary', { underline: true });
    doc.fontSize(12);
    doc.text(`Subtotal: $${subtotal.toLocaleString()}`);
    doc.text(`Contingency (${rehabScope.contingencyPercent}%): $${(subtotal * rehabScope.contingencyPercent / 100).toLocaleString()}`);
    doc.text(`Permits/Fees: $${rehabScope.permitFees.toLocaleString()}`);
    doc.fontSize(14).text(`Total Rehabilitation Cost: $${rehabScope.totalCost.toLocaleString()}`, { 
      underline: true 
    });
    doc.moveDown();

    // Timeline & ROI
    doc.fontSize(18).text('Timeline & Returns', { underline: true });
    doc.fontSize(12);
    doc.text(`Estimated Timeline: ${rehabScope.timeline} days`);
    doc.text(`Purchase Price: $${propertyData.listingPrice?.toLocaleString() || 'TBD'}`);
    doc.text(`After Repair Value (ARV): $${propertyData.estimatedARV?.toLocaleString() || 'TBD'}`);
    doc.text(`Total Investment: $${(propertyData.listingPrice + rehabScope.totalCost).toLocaleString()}`);
    doc.fontSize(16).fillColor('green').text(`Projected ROI: ${rehabScope.projectedROI}%`);

    // Footer
    doc.fillColor('black').fontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 50, doc.page.height - 50);

    doc.end();

    return { filename, filepath };
  }

  async generateFactSheetPDF(factSheet) {
    const doc = new PDFDocument({ margin: 50 });
    const filename = `fact-sheet-${factSheet.summary.address.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.pdf`;
    const filepath = path.join(this.outputDir, filename);
    
    doc.pipe(fs.createWriteStream(filepath));

    // Header with styling
    doc.fillColor('#2C3E50').fontSize(28).text('Property Fact Sheet', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('black').fontSize(16).text(factSheet.summary.address, { align: 'center' });
    doc.moveDown();

    // Property Overview Box
    this.drawBox(doc, 50, doc.y, 500, 120);
    doc.fontSize(14).text('Property Overview', 60, doc.y + 10, { underline: true });
    doc.fontSize(11).text(`Beds/Baths: ${factSheet.summary.beds} / ${factSheet.summary.baths}`, 60, doc.y + 10);
    doc.text(`Square Footage: ${factSheet.summary.squareFootage.toLocaleString()} sq ft`, 300, doc.y - 11);
    doc.text(`Year Built: ${factSheet.summary.yearBuilt}`, 60, doc.y + 5);
    doc.text(`Property Type: ${factSheet.summary.propertyType}`, 300, doc.y - 11);
    doc.text(`Infrastructure Score: ${factSheet.infrastructureScore}/100`, 60, doc.y + 5);
    doc.text(`Lien Status: ${factSheet.lienStatus}`, 300, doc.y - 11);
    doc.moveDown(2);

    // Financial Analysis
    doc.fontSize(16).fillColor('#2C3E50').text('Financial Analysis', { underline: true });
    doc.fillColor('black').fontSize(12);
    doc.text(`Listing Price: $${factSheet.financials.listingPrice.toLocaleString()}`);
    doc.text(`Estimated Rehab Cost: $${factSheet.financials.rehabCost.toLocaleString()}`);
    doc.text(`After Repair Value (ARV): $${factSheet.financials.estimatedARV.toLocaleString()}`);
    doc.fontSize(14).fillColor('#27AE60').text(`Projected ROI: ${factSheet.financials.projectedROI}%`);
    doc.fillColor('black').moveDown();

    // Comparable Sales
    if (factSheet.comps && factSheet.comps.length > 0) {
      doc.fontSize(16).fillColor('#2C3E50').text('Recent Comparable Sales', { underline: true });
      doc.fillColor('black').fontSize(11);
      
      factSheet.comps.slice(0, 3).forEach(comp => {
        doc.text(`• ${comp.address} - $${comp.soldPrice.toLocaleString()} (${comp.distance} miles away)`);
        doc.text(`  ${comp.beds}/${comp.baths}, ${comp.squareFootage} sqft, Sold: ${new Date(comp.soldDate).toLocaleDateString()}`);
        doc.moveDown(0.5);
      });
    }

    // Highlights & Risks
    doc.addPage();
    
    // Highlights
    doc.fontSize(16).fillColor('#2C3E50').text('Investment Highlights', { underline: true });
    doc.fillColor('black').fontSize(12);
    factSheet.highlights.forEach(highlight => {
      doc.fillColor('#27AE60').text('✓ ', { continued: true });
      doc.fillColor('black').text(highlight);
    });
    doc.moveDown();

    // Risks
    doc.fontSize(16).fillColor('#2C3E50').text('Potential Risks', { underline: true });
    doc.fillColor('black').fontSize(12);
    factSheet.risks.forEach(risk => {
      doc.fillColor('#E74C3C').text('⚠ ', { continued: true });
      doc.fillColor('black').text(risk);
    });

    // Footer
    doc.fontSize(10).fillColor('#7F8C8D');
    doc.text(`Generated on ${new Date().toLocaleString()}`, 50, doc.page.height - 50);
    doc.text('TriPilot Real Estate Analysis', 400, doc.page.height - 50);

    doc.end();

    return { filename, filepath };
  }

  drawBox(doc, x, y, width, height) {
    doc.rect(x, y, width, height)
       .strokeColor('#BDC3C7')
       .lineWidth(1)
       .stroke();
  }

  async generateSpreadsheet(rehabScope, propertyData) {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rehab Scope');

    // Headers
    worksheet.columns = [
      { header: 'Work Item', key: 'workType', width: 25 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Unit Cost', key: 'unitCost', width: 12 },
      { header: 'Total Cost', key: 'totalCost', width: 15 },
      { header: 'Notes', key: 'notes', width: 30 }
    ];

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2C3E50' }
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' } };

    // Add data
    rehabScope.items.forEach(item => {
      worksheet.addRow({
        workType: item.workType,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unitCost,
        totalCost: item.totalCost,
        notes: item.notes || ''
      });
    });

    // Add summary rows
    worksheet.addRow({});
    worksheet.addRow({ workType: 'Subtotal', totalCost: rehabScope.items.reduce((sum, item) => sum + item.totalCost, 0) });
    worksheet.addRow({ workType: `Contingency (${rehabScope.contingencyPercent}%)`, totalCost: rehabScope.items.reduce((sum, item) => sum + item.totalCost, 0) * rehabScope.contingencyPercent / 100 });
    worksheet.addRow({ workType: 'Permits/Fees', totalCost: rehabScope.permitFees });
    worksheet.addRow({ workType: 'TOTAL', totalCost: rehabScope.totalCost });

    // Style summary rows
    const lastRow = worksheet.lastRow.number;
    worksheet.getRow(lastRow).font = { bold: true, size: 14 };

    // Format currency columns
    worksheet.getColumn('unitCost').numFmt = '$#,##0.00';
    worksheet.getColumn('totalCost').numFmt = '$#,##0.00';

    // Save
    const filename = `rehab-scope-${propertyData.address.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.xlsx`;
    const filepath = path.join(this.outputDir, filename);
    await workbook.xlsx.writeFile(filepath);

    return { filename, filepath };
  }
}

module.exports = new PDFGenerator();
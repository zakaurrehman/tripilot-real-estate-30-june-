// // backend/src/controllers/searchController.js - COMPLETE UPDATED VERSION

// const documentProcessor = require('../services/documentProcessor');
// const vectorStore = require('../services/vectorStore');
// const db = require('../config/database');
// const { trackLapisUsage } = require('../utils/lapisTracker');

// class SearchController {
//   async uploadDocuments(req, res) {
//     console.log('🔥 uploadDocuments hit, files:', req.files?.length);

//     try {
//       const { files } = req;
//       const userId = req.user.id;

//       if (!files || files.length === 0) {
//         return res.status(400).json({ 
//           success: false,
//           error: 'No files uploaded' 
//         });
//       }

//       if (files.length > 3) {
//         return res.status(400).json({ 
//           success: false,
//           error: 'Maximum 3 files allowed per upload' 
//         });
//       }

//       console.log('Processing files for user:', userId);
      
//       // Process documents in parallel
//       const results = await documentProcessor.processBatch(files, userId);

//       // Track Lapis usage
//       await trackLapisUsage(userId, 'search', files.length * 2);

//       console.log('Document processing completed:', results.length);

//       res.json({
//         success: true,
//         documents: results,
//         message: `Successfully processed ${results.length} documents`
//       });
//     } catch (error) {
//       console.error('Upload error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to process documents',
//         details: error.message 
//       });
//     }
//   }

//   async searchDocuments(req, res) {
//     try {
//       const { query, filters, page = 1, limit = 20 } = req.body;
//       const userId = req.user.id;

//       if (!query) {
//         return res.status(400).json({
//           success: false,
//           error: 'Search query is required'
//         });
//       }

//       // Search in vector store
//       const searchResults = await vectorStore.searchDocuments(query, filters, limit);

//       // Get full document data
//       const documentIds = searchResults.map(r => r.documentId);
//       const documents = await db.document.findMany({
//         where: {
//           id: { in: documentIds },
//           userId
//         }
//       });

//       // Merge results
//       const results = searchResults.map(result => {
//         const doc = documents.find(d => d.id === result.documentId);
//         return {
//           ...doc,
//           score: result.score,
//           relevantChunks: result.relevantChunks
//         };
//       });

//       res.json({
//         success: true,
//         results,
//         total: results.length,
//         page,
//         query
//       });
//     } catch (error) {
//       console.error('Search error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Search failed',
//         details: error.message 
//       });
//     }
//   }

//   async getDocumentFields(req, res) {
//     try {
//       const userId = req.user.id;
//       const { documentIds } = req.query;

//       const where = { userId };
//       if (documentIds) {
//         where.id = { in: documentIds.split(',') };
//       }

//       const documents = await db.document.findMany({
//         where,
//         select: {
//           id: true,
//           filename: true,
//           type: true,
//           extractedFields: true,
//           uploadedAt: true,
//           status: true
//         },
//         orderBy: { uploadedAt: 'desc' }
//       });

//       // Transform for table display - flatten extracted fields to top level
//       const tableData = documents.map(doc => {
//         const flattened = this.flattenFields(doc.extractedFields || {});
//         return {
//           id: doc.id,
//           filename: doc.filename,
//           type: doc.type,
//           uploadedAt: doc.uploadedAt,
//           status: doc.status,
//           ...flattened
//         };
//       });

//       // Get all unique field names for column configuration
//       const allFields = new Set();
//       tableData.forEach(row => {
//         Object.keys(row).forEach(key => allFields.add(key));
//       });

//       res.json({
//         success: true,
//         data: tableData,
//         columns: Array.from(allFields),
//         total: documents.length
//       });
//     } catch (error) {
//       console.error('Get fields error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to retrieve document fields',
//         details: error.message 
//       });
//     }
//   }

//   flattenFields(fields) {
//     const flattened = {};
    
//     // Core fields
//     const coreFields = [
//       'address', 'squareFootage', 'beds', 'baths', 'yearBuilt',
//       'listingPrice', 'estimatedARV', 'lienStatus', 'infrastructureScore',
//       'propertyType', 'lotSize', 'taxAssessment', 'zoningType',
//       'heatingType', 'coolingType', 'roofType', 'roofAge',
//       'kitchenCondition', 'bathroomCondition', 'garageSpaces'
//     ];

//     coreFields.forEach(field => {
//       if (fields[field] !== undefined) {
//         flattened[field] = fields[field];
//       } else {
//         flattened[field] = 'N/A';
//       }
//     });

//     // Add comps count if available
//     if (fields.comps && Array.isArray(fields.comps)) {
//       flattened.compsCount = fields.comps.length;
//     }

//     return flattened;
//   }

//   async updateField(req, res) {
//     try {
//       const { documentId } = req.params;
//       const { field, value } = req.body;
//       const userId = req.user.id;

//       if (!field || value === undefined) {
//         return res.status(400).json({
//           success: false,
//           error: 'Field name and value are required'
//         });
//       }

//       const document = await db.document.findFirst({
//         where: { id: documentId, userId }
//       });

//       if (!document) {
//         return res.status(404).json({ 
//           success: false,
//           error: 'Document not found' 
//         });
//       }

//       // Update the field
//       const updatedFields = {
//         ...document.extractedFields,
//         [field]: value
//       };

//       await db.document.update({
//         where: { id: documentId },
//         data: { extractedFields: updatedFields }
//       });

//       // Update in vector store
//       try {
//         await vectorStore.storeDocument(documentId, {
//           text: '', // Keep existing text
//           fields: updatedFields,
//           metadata: { filename: document.filename, type: document.type }
//         });
//       } catch (vectorError) {
//         console.error('Vector store update failed:', vectorError);
//         // Continue without failing the request
//       }

//       res.json({
//         success: true,
//         message: 'Field updated successfully'
//       });
//     } catch (error) {
//       console.error('Update field error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to update field',
//         details: error.message 
//       });
//     }
//   }

//   async deleteDocument(req, res) {
//     try {
//       const { documentId } = req.params;
//       const userId = req.user.id;

//       // Verify ownership
//       const document = await db.document.findFirst({
//         where: { id: documentId, userId }
//       });

//       if (!document) {
//         return res.status(404).json({ 
//           success: false,
//           error: 'Document not found' 
//         });
//       }

//       // Delete from vector store
//       try {
//         await vectorStore.deleteDocument(documentId);
//       } catch (vectorError) {
//         console.error('Vector store deletion failed:', vectorError);
//         // Continue with database deletion
//       }

//       // Delete from database
//       await db.document.delete({
//         where: { id: documentId }
//       });

//       res.json({
//         success: true,
//         message: 'Document deleted successfully'
//       });
//     } catch (error) {
//       console.error('Delete error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Failed to delete document',
//         details: error.message 
//       });
//     }
//   }

//   async exportTable(req, res) {
//     try {
//       const { format = 'csv', documentIds } = req.query;
//       const userId = req.user.id;

//       const where = { userId };
//       if (documentIds) {
//         where.id = { in: documentIds.split(',') };
//       }

//       const documents = await db.document.findMany({
//         where,
//         select: {
//           id: true,
//           filename: true,
//           extractedFields: true
//         }
//       });

//       if (format === 'csv') {
//         const csv = this.generateCSV(documents);
//         res.setHeader('Content-Type', 'text/csv');
//         res.setHeader('Content-Disposition', 'attachment; filename=property-data.csv');
//         res.send(csv);
//       } else {
//         res.status(400).json({ 
//           success: false,
//           error: 'Unsupported format. Only CSV is currently supported.' 
//         });
//       }
//     } catch (error) {
//       console.error('Export error:', error);
//       res.status(500).json({ 
//         success: false,
//         error: 'Export failed',
//         details: error.message 
//       });
//     }
//   }

//   generateCSV(documents) {
//     const headers = [
//       'Filename', 'Address', 'Beds', 'Baths', 'Square Footage',
//       'Listing Price', 'Estimated ARV', 'Year Built', 'Property Type',
//       'Lien Status', 'Infrastructure Score'
//     ];

//     const rows = documents.map(doc => {
//       const fields = doc.extractedFields || {};
//       return [
//         doc.filename,
//         fields.address || '',
//         fields.beds || '',
//         fields.baths || '',
//         fields.squareFootage || '',
//         fields.listingPrice || '',
//         fields.estimatedARV || '',
//         fields.yearBuilt || '',
//         fields.propertyType || '',
//         fields.lienStatus || '',
//         fields.infrastructureScore || ''
//       ];
//     });

//     return [
//       headers.join(','),
//       ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
//     ].join('\n');
//   }
// }

// module.exports = new SearchController();
// backend/src/controllers/searchController.js - TEMPORARY FIX FOR TESTING

const documentProcessor = require('../services/documentProcessor');
const vectorStore = require('../services/vectorStore');
const db = require('../config/database');
// const { trackLapisUsage } = require('../utils/lapisTracker'); // DISABLED FOR NOW

class SearchController {
  constructor() {
    // bind methods so "this" is always correct
    this.uploadDocuments   = this.uploadDocuments.bind(this);
    this.searchDocuments   = this.searchDocuments.bind(this);
    this.getDocumentFields = this.getDocumentFields.bind(this);
    this.updateField       = this.updateField.bind(this);
    this.deleteDocument    = this.deleteDocument.bind(this);
    this.exportTable       = this.exportTable.bind(this);
  }
  async uploadDocuments(req, res) {
    console.log('🔥 uploadDocuments hit, files:', req.files?.length);

    try {
      const { files } = req;
      const userId = req.user.id;

      if (!files || files.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: 'No files uploaded' 
        });
      }

      if (files.length > 3) {
        return res.status(400).json({ 
          success: false,
          error: 'Maximum 3 files allowed per upload' 
        });
      }

      console.log('Processing files for user:', userId);
      console.log('Files:', files.map(f => ({ name: f.originalname, size: f.size, type: f.mimetype })));
      
      // Process documents in parallel
      const results = await documentProcessor.processBatch(files, userId);

      // Skip Lapis tracking for now
      console.log('⏭️ Skipping Lapis tracking for testing...');
      // await trackLapisUsage(userId, 'search', files.length * 2);

      console.log('Document processing completed:', results.length);

      res.json({
        success: true,
        documents: results,
        message: `Successfully processed ${results.length} documents`
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to process documents',
        details: error.message 
      });
    }
  }

  async searchDocuments(req, res) {
    try {
      const { query, filters, page = 1, limit = 20 } = req.body;
      const userId = req.user.id;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      // Skip vector search for now, use simple text matching
      console.log('🔍 Simple search for:', query);
      
      const documents = await db.document.findMany({
        where: { userId, status: 'completed' }
      });

      // Simple text search in extracted fields
      const results = documents.filter(doc => {
        const searchText = JSON.stringify(doc.extractedFields || {}).toLowerCase();
        return searchText.includes(query.toLowerCase());
      });

      res.json({
        success: true,
        results,
        total: results.length,
        page,
        query
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Search failed',
        details: error.message 
      });
    }
  }

  async getDocumentFields(req, res) {
    try {
      const userId     = req.user.id;
      const { documentIds } = req.query;

      // build prisma where clause
      const where = { userId };
      if (documentIds) {
        where.id = { in: documentIds.split(',') };
      }

      // fetch only the columns we need
      const documents = await db.document.findMany({
        where,
        select: {
          id: true,
          filename: true,
          type: true,
          extractedFields: true,
          uploadedAt: true,
          status: true
        },
        orderBy: { uploadedAt: 'desc' }
      });

      // flatten each doc's extractedFields
      const tableData = documents.map(doc => {
        const flattened = this.flattenFields(doc.extractedFields || {});
        return {
          id:         doc.id,
          filename:   doc.filename,
          type:       doc.type,
          uploadedAt: doc.uploadedAt,
          status:     doc.status,
          ...flattened
        };
      });

      // collect all unique column keys
      const allFields = new Set();
      tableData.forEach(row => Object.keys(row).forEach(key => allFields.add(key)));

      // return under "data" to match common patterns
      res.json({
        success: true,
        data:    tableData,
        columns: Array.from(allFields),
        total:   documents.length
      });
    } catch (error) {
      console.error('Get fields error:', error);
      res.status(500).json({
        success: false,
        error:   'Failed to retrieve document fields',
        details: error.message
      });
    }
  }

  flattenFields(fields) {
    const flattened = {};
    
    // Core fields
    const coreFields = [
      'address', 'squareFootage', 'beds', 'baths', 'yearBuilt',
      'listingPrice', 'estimatedARV', 'lienStatus', 'infrastructureScore',
      'propertyType', 'lotSize', 'taxAssessment', 'zoningType',
      'heatingType', 'coolingType', 'roofType', 'roofAge',
      'kitchenCondition', 'bathroomCondition', 'garageSpaces'
    ];

    coreFields.forEach(field => {
      if (fields[field] !== undefined) {
        flattened[field] = fields[field];
      } else {
        flattened[field] = 'N/A';
      }
    });

    // Add comps count if available
    if (fields.comps && Array.isArray(fields.comps)) {
      flattened.compsCount = fields.comps.length;
    }

    return flattened;
  }

  async updateField(req, res) {
    try {
      const { documentId } = req.params;
      const { field, value } = req.body;
      const userId = req.user.id;

      if (!field || value === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Field name and value are required'
        });
      }

      const document = await db.document.findFirst({
        where: { id: documentId, userId }
      });

      if (!document) {
        return res.status(404).json({ 
          success: false,
          error: 'Document not found' 
        });
      }

      // Update the field
      const updatedFields = {
        ...document.extractedFields,
        [field]: value
      };

      await db.document.update({
        where: { id: documentId },
        data: { extractedFields: updatedFields }
      });

      res.json({
        success: true,
        message: 'Field updated successfully'
      });
    } catch (error) {
      console.error('Update field error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to update field',
        details: error.message 
      });
    }
  }

  async deleteDocument(req, res) {
    try {
      const { documentId } = req.params;
      const userId = req.user.id;

      // Verify ownership
      const document = await db.document.findFirst({
        where: { id: documentId, userId }
      });

      if (!document) {
        return res.status(404).json({ 
          success: false,
          error: 'Document not found' 
        });
      }

      // Delete from database
      await db.document.delete({
        where: { id: documentId }
      });

      res.json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to delete document',
        details: error.message 
      });
    }
  }

  async exportTable(req, res) {
    try {
      const { format = 'csv', documentIds } = req.query;
      const userId = req.user.id;

      const where = { userId };
      if (documentIds) {
        where.id = { in: documentIds.split(',') };
      }

      const documents = await db.document.findMany({
        where,
        select: {
          id: true,
          filename: true,
          extractedFields: true
        }
      });

      if (format === 'csv') {
        const csv = this.generateCSV(documents);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=property-data.csv');
        res.send(csv);
      } else {
        res.status(400).json({ 
          success: false,
          error: 'Unsupported format. Only CSV is currently supported.' 
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Export failed',
        details: error.message 
      });
    }
  }

  generateCSV(documents) {
    const headers = [
      'Filename', 'Address', 'Beds', 'Baths', 'Square Footage',
      'Listing Price', 'Estimated ARV', 'Year Built', 'Property Type',
      'Lien Status', 'Infrastructure Score'
    ];

    const rows = documents.map(doc => {
      const fields = doc.extractedFields || {};
      return [
        doc.filename,
        fields.address || '',
        fields.beds || '',
        fields.baths || '',
        fields.squareFootage || '',
        fields.listingPrice || '',
        fields.estimatedARV || '',
        fields.yearBuilt || '',
        fields.propertyType || '',
        fields.lienStatus || '',
        fields.infrastructureScore || ''
      ];
    });

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }
}

module.exports = new SearchController();
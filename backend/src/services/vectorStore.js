// backend/src/services/vectorStore.js
// Fixed version with proper metadata handling for Pinecone

const { Pinecone } = require('@pinecone-database/pinecone');

const {
  PINECONE_API_KEY,
  PINECONE_INDEX_NAME = 'tripilot-real-estate',
} = process.env;

if (!PINECONE_API_KEY) {
  throw new Error('Set PINECONE_API_KEY in .env');
}

// Initialize Pinecone client
const pc = new Pinecone({
  apiKey: PINECONE_API_KEY
});

let index;

// Import OpenAI service for real embeddings
const openaiService = require('./openaiService');

// Helper to reduce vector dimensions if needed
function reduceDimensions(vector, targetDim = 1024) {
  if (vector.length <= targetDim) return vector;
  
  // Simple truncation - maintains most important features
  return vector.slice(0, targetDim);
}

// Helper to flatten nested objects for Pinecone metadata
function flattenForMetadata(obj, prefix = '') {
  const flattened = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}_${key}` : key;
    
    if (value === null || value === undefined) {
      flattened[newKey] = null;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      // Recursively flatten nested objects
      Object.assign(flattened, flattenForMetadata(value, newKey));
    } else if (Array.isArray(value)) {
      // Convert arrays to strings
      flattened[newKey] = value.join(', ');
    } else if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
      flattened[newKey] = value;
    } else {
      // Convert other types to string
      flattened[newKey] = String(value);
    }
  }
  
  return flattened;
}

// Helpers
function createChunks(fields) {
  const {
    address, beds, baths, squareFootage,
    listingPrice, estimatedARV, taxAssessment,
    roofAge, kitchenCondition, bathroomCondition,
    propertyType, yearBuilt, lienStatus
  } = fields;

  const chunks = [
    {
      id: 'basic',
      type: 'basic_info',
      text: `Property at ${address || 'Unknown'}: ${beds || 0} beds, ${baths || 0} baths, ${squareFootage || 0} sqft, ${propertyType || 'Unknown type'}, built in ${yearBuilt || 'Unknown year'}`,
      fields: { address, beds, baths, squareFootage, propertyType, yearBuilt }
    },
    {
      id: 'financial',
      type: 'financial',
      text: `Listing price $${listingPrice || 0}, ARV $${estimatedARV || 0}, Tax assessment $${taxAssessment || 0}, Lien status: ${lienStatus || 'Unknown'}`,
      fields: { listingPrice, estimatedARV, taxAssessment, lienStatus }
    }
  ];

  // Add condition chunk if we have condition data
  if (roofAge || kitchenCondition || bathroomCondition) {
    chunks.push({
      id: 'condition',
      type: 'condition',
      text: `Property condition - Roof age: ${roofAge || 'unknown'} years, Kitchen: ${kitchenCondition || 'unknown'}, Bathrooms: ${bathroomCondition || 'unknown'}`,
      fields: { roofAge, kitchenCondition, bathroomCondition }
    });
  }

  // Add infrastructure chunk if we have infrastructure score
  if (fields.infrastructureScore) {
    chunks.push({
      id: 'infrastructure',
      type: 'infrastructure',
      text: `Infrastructure score: ${fields.infrastructureScore}/100 indicating ${fields.infrastructureScore > 80 ? 'excellent' : fields.infrastructureScore > 60 ? 'good' : 'needs attention'} property condition`,
      fields: { infrastructureScore: fields.infrastructureScore }
    });
  }

  return chunks;
}

function createSummary(fields) {
  // Create a comprehensive summary text for embedding
  const summary = [];
  
  if (fields.address) summary.push(`Located at ${fields.address}`);
  if (fields.beds && fields.baths) summary.push(`${fields.beds} bedrooms and ${fields.baths} bathrooms`);
  if (fields.squareFootage) summary.push(`${fields.squareFootage} square feet`);
  if (fields.propertyType) summary.push(`${fields.propertyType} property`);
  if (fields.yearBuilt) summary.push(`built in ${fields.yearBuilt}`);
  if (fields.listingPrice) summary.push(`listed at $${fields.listingPrice.toLocaleString()}`);
  if (fields.estimatedARV) summary.push(`estimated ARV $${fields.estimatedARV.toLocaleString()}`);
  if (fields.lienStatus) summary.push(`lien status: ${fields.lienStatus}`);
  if (fields.infrastructureScore) summary.push(`infrastructure score ${fields.infrastructureScore}/100`);
  
  return summary.join(', ');
}

function buildFilter(filters) {
  const f = {};
  if (filters.documentType) f.type = { $eq: filters.documentType };
  if (filters.priceRange) {
    f['fields_listingPrice'] = { 
      $gte: filters.priceRange.min, 
      $lte: filters.priceRange.max 
    };
  }
  if (filters.beds) f['fields_beds'] = { $gte: filters.beds };
  if (filters.baths) f['fields_baths'] = { $gte: filters.baths };
  if (filters.propertyType) f['fields_propertyType'] = { $eq: filters.propertyType };
  if (filters.lienStatus) f['fields_lienStatus'] = { $eq: filters.lienStatus };
  
  return f;
}

function groupMatches(res) {
  const docs = new Map();
  
  for (const match of res.matches || []) {
    const { documentId, chunkType, text } = match.metadata;
    
    if (!docs.has(documentId)) {
      docs.set(documentId, {
        documentId,
        score: match.score,
        metadata: match.metadata,
        relevantChunks: []
      });
    }
    
    docs.get(documentId).relevantChunks.push({
      type: chunkType,
      text,
      score: match.score
    });
    
    // Update overall score to be the highest chunk score
    const doc = docs.get(documentId);
    if (match.score > doc.score) {
      doc.score = match.score;
    }
  }
  
  return Array.from(docs.values()).sort((a, b) => b.score - a.score);
}

// VectorStore
class VectorStore {
  namespace = 'real-estate';

  /** Initialize and get the index */
  async initialize() {
    try {
      console.log(`🔄 Initializing Pinecone index "${PINECONE_INDEX_NAME}"...`);
      
      // Get the index
      index = pc.index(PINECONE_INDEX_NAME);
      
      // Test the connection with a simple query using appropriate dimensions
      try {
        await index.query({
          vector: Array(1024).fill(0.1), // Use 1024 dimensions for existing index
          topK: 1,
          includeMetadata: false
        });
        console.log(`✅ VectorStore ready for index "${PINECONE_INDEX_NAME}" (1024 dimensions)`);
      } catch (testError) {
        // If 1024 fails, try 1536
        await index.query({
          vector: Array(1536).fill(0.1),
          topK: 1,
          includeMetadata: false
        });
        console.log(`✅ VectorStore ready for index "${PINECONE_INDEX_NAME}" (1536 dimensions)`);
      }
      
    } catch (error) {
      console.error('❌ VectorStore initialization failed:', error);
      throw new Error(`Failed to connect to Pinecone index: ${error.message}`);
    }
  }

  /** Upsert document chunks + full summary with dimension handling */
  async storeDocument(documentId, { text, fields, metadata = {} }) {
    try {
      console.log(`🔄 Storing document ${documentId} in vector store...`);
      
      // Create chunks and get embeddings for each
      const chunks = createChunks(fields);
      const chunkVectors = [];
      
      // Process each chunk
      for (const chunk of chunks) {
        console.log(`📝 Getting embedding for chunk: ${chunk.type}`);
        let embedding = await openaiService.embedText(chunk.text);
        
        // Reduce dimensions if necessary (1536 -> 1024)
        embedding = reduceDimensions(embedding, 1024);
        
        // Flatten the fields for metadata
        const flattenedFields = flattenForMetadata(chunk.fields);
        
        chunkVectors.push({
          id: `${documentId}_${chunk.id}`,
          values: embedding,
          metadata: {
            documentId,
            chunkType: chunk.type,
            text: chunk.text,
            filename: metadata.filename || 'Unknown',
            type: metadata.type || 'unknown',
            uploadedAt: metadata.uploadedAt || new Date().toISOString(),
            ...flattenedFields, // Spread flattened fields
            ...flattenForMetadata(metadata) // Spread flattened metadata
          }
        });
      }
      
      // Create summary vector
      const summaryText = createSummary(fields);
      console.log(`📄 Getting embedding for document summary`);
      let summaryEmbedding = await openaiService.embedText(summaryText);
      
      // Reduce dimensions if necessary
      summaryEmbedding = reduceDimensions(summaryEmbedding, 1024);
      
      // Flatten all fields for the summary vector
      const flattenedFields = flattenForMetadata(fields);
      
      const summaryVector = {
        id: documentId,
        values: summaryEmbedding,
        metadata: {
          documentId,
          chunkType: 'full_document',
          text: summaryText,
          filename: metadata.filename || 'Unknown',
          type: metadata.type || 'unknown',
          uploadedAt: metadata.uploadedAt || new Date().toISOString(),
          ...flattenedFields, // Spread flattened fields
          ...flattenForMetadata(metadata) // Spread flattened metadata
        }
      };

      // Upsert all vectors
      const vectorsToUpsert = [...chunkVectors, summaryVector];
      
      console.log(`⬆️ Upserting ${vectorsToUpsert.length} vectors to Pinecone...`);
      await index.upsert(vectorsToUpsert);
      
      console.log(`✅ Successfully stored document ${documentId} with ${vectorsToUpsert.length} vectors`);
      
    } catch (error) {
      console.error('❌ Vector store error:', error);
      throw new Error(`Failed to store document in vector store: ${error.message}`);
    }
  }

  /** Search documents by query + optional filters */
  async searchDocuments(query, filters = {}, topK = 10) {
    try {
      console.log(`🔍 Searching for: "${query}" with filters:`, filters);
      
      // Get embedding for the query
      let queryEmbedding = await openaiService.embedText(query);
      
      // Reduce dimensions if necessary
      queryEmbedding = reduceDimensions(queryEmbedding, 1024);
      
      const params = {
        vector: queryEmbedding,
        topK,
        includeMetadata: true
      };
      
      // Add filters if provided
      const combinedFilters = buildFilter(filters);
      
      if (Object.keys(combinedFilters).length > 0) {
        params.filter = combinedFilters;
        console.log(`🎯 Applied filters:`, params.filter);
      }
      
      const res = await index.query(params);
      const results = groupMatches(res);
      
      console.log(`✅ Found ${results.length} matching documents`);
      
      return results;
      
    } catch (error) {
      console.error('❌ Document search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /** Delete document vectors */
  async deleteDocument(documentId) {
    try {
      console.log(`🗑️ Deleting document ${documentId} from vector store...`);
      
      // Delete all vectors associated with this document
      // We need to delete the main document and all its chunks
      const vectorIds = [
        documentId, // Main document
        `${documentId}_basic`,
        `${documentId}_financial`,
        `${documentId}_condition`,
        `${documentId}_infrastructure`
      ];
      
      await index.deleteMany(vectorIds);
      
      console.log(`✅ Successfully deleted document ${documentId} and its chunks`);
      
    } catch (error) {
      console.error('❌ Vector deletion error:', error);
      throw new Error(`Failed to delete document from vector store: ${error.message}`);
    }
  }

  /** Store chat conversation for context */
  async storeConversation(conversationId, { messages, userId, summary }) {
    try {
      console.log(`💬 Storing conversation ${conversationId}...`);
      
      const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      let embedding = await openaiService.embedText(conversationText);
      
      // Reduce dimensions if necessary
      embedding = reduceDimensions(embedding, 1024);
      
      await index.upsert([{
        id: `conv_${conversationId}`,
        values: embedding,
        metadata: {
          conversationId,
          userId,
          type: 'conversation',
          summary: summary || conversationText.substring(0, 200),
          messageCount: messages.length,
          lastMessage: messages[messages.length - 1]?.content || '',
          timestamp: new Date().toISOString()
        }
      }]);
      
      console.log(`✅ Conversation stored successfully`);
      
    } catch (error) {
      console.error('❌ Conversation storage error:', error);
      // Non-critical error, don't throw
    }
  }

  /** Health check for vector store */
  async healthCheck() {
    try {
      // Test with the correct dimensions
      await index.query({
        vector: Array(1024).fill(0.1),
        topK: 1,
        includeMetadata: false
      });
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        indexName: PINECONE_INDEX_NAME,
        dimensions: 1024
      };
      
    } catch (error) {
      console.error('❌ Vector store health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
        indexName: PINECONE_INDEX_NAME
      };
    }
  }
}

module.exports = new VectorStore();

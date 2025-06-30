// backend/src/controllers/chatController.js
// Complete updated version with all functionality

const openaiService = require('../services/openaiService');
const vectorStore = require('../services/vectorStore');
const db = require('../config/database');

// In-memory storage for conversations (replace with database in production)
const conversations = new Map();

class ChatController {
  /**
   * Send a message to the chat and get AI response
   */
  async sendMessage(req, res) {
    try {
      const { conversationId, message } = req.body;
      const userId = req.user.id;

      if (!message || !conversationId) {
        return res.status(400).json({
          success: false,
          error: 'Message and conversationId are required'
        });
      }

      console.log(`💬 Chat message from user ${userId}: "${message}"`);

      // Get or create conversation
      if (!conversations.has(conversationId)) {
        conversations.set(conversationId, {
          id: conversationId,
          userId,
          messages: [],
          createdAt: new Date(),
          lastActivity: new Date(),
          metadata: {
            totalTokens: 0,
            totalCost: 0
          }
        });
      }

      const conversation = conversations.get(conversationId);
      
      // Verify user owns this conversation
      if (conversation.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this conversation'
        });
      }

      // Add user message
      conversation.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      // Search for relevant documents and context
      let context = '';
      let relevantDocuments = [];
      
      try {
        const searchResults = await vectorStore.searchDocuments(message, {}, 5);
        
        if (searchResults.length > 0) {
          // Build context from search results
          context = searchResults
            .map(r => {
              const text = r.metadata?.text || '';
              const docId = r.documentId;
              const score = r.score;
              
              // Track relevant documents
              if (score > 0.7) {
                relevantDocuments.push({
                  documentId: docId,
                  filename: r.metadata?.filename || 'Unknown',
                  relevance: score
                });
              }
              
              return text;
            })
            .filter(text => text)
            .join('\n\n');
        }
      } catch (error) {
        console.error('Vector search for context failed:', error);
        // Continue without context
      }

      // Build system prompt with context
      const systemPrompt = `You are TriPilot, an AI assistant specialized in real estate investment and property analysis. 
      You help users with:
      - Property valuation and investment analysis
      - Renovation planning and ROI calculations
      - Contractor matching and project management
      - Market insights and comparable property analysis
      
      ${context ? `\nRelevant property information from uploaded documents:\n${context}\n\nUse this information to provide specific, data-driven responses.` : ''}
      
      Guidelines:
      - Be concise but thorough
      - Provide specific numbers and calculations when possible
      - Mention confidence levels for estimates
      - Suggest next steps or additional analyses when appropriate`;

      // Generate AI response
      let aiResponse;
      try {
        aiResponse = await openaiService.generateResponse(
          conversation.messages.map(m => ({
            role: m.role,
            content: m.content
          })),
          systemPrompt
        );
      } catch (error) {
        console.error('OpenAI response generation failed:', error);
        aiResponse = "I apologize, but I'm having trouble generating a response right now. Please try again in a moment.";
      }

      // Add AI response to conversation
      conversation.messages.push({
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
        metadata: {
          relevantDocuments: relevantDocuments.length > 0 ? relevantDocuments : undefined
        }
      });

      // Update conversation metadata
      conversation.lastActivity = new Date();
      conversation.metadata.totalTokens += (message.length + aiResponse.length) / 4; // Rough token estimate
      conversation.metadata.totalCost += conversation.metadata.totalTokens * 0.000002; // Rough cost estimate

      // Store conversation in vector store for future context (async, don't wait)
      vectorStore.storeConversation(conversationId, {
        messages: conversation.messages.slice(-10), // Last 10 messages
        userId,
        summary: aiResponse.substring(0, 200)
      }).catch(error => {
        console.error('Failed to store conversation in vector store:', error);
      });

      // Return response
      res.json({
        success: true,
        response: aiResponse,
        conversationId,
        messageCount: conversation.messages.length,
        relevantDocuments: relevantDocuments.length > 0 ? relevantDocuments : undefined,
        usage: {
          tokensUsed: Math.round(conversation.metadata.totalTokens),
          estimatedCost: conversation.metadata.totalCost.toFixed(4)
        }
      });

    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to process message',
        details: error.message 
      });
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      const conversation = conversations.get(conversationId);
      
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
      }

      if (conversation.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Format messages for response
      const formattedMessages = conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata
      }));

      res.json({
        success: true,
        conversation: {
          id: conversation.id,
          messages: formattedMessages,
          createdAt: conversation.createdAt,
          lastActivity: conversation.lastActivity,
          metadata: conversation.metadata
        }
      });

    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to retrieve conversation',
        details: error.message 
      });
    }
  }

  /**
   * Get similar questions based on query
   */
  async getSimilarQuestions(req, res) {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query is required'
        });
      }

      // Try to find similar questions from vector store
      let similarQuestions = [];
      
      try {
        // Search for similar conversations
        const similarConversations = await vectorStore.findSimilarConversations(query, 5);
        
        if (similarConversations.length > 0) {
          similarQuestions = similarConversations
            .map(conv => conv.preview)
            .filter(q => q && q !== query)
            .slice(0, 3);
        }
      } catch (error) {
        console.error('Similar conversation search failed:', error);
      }

      // If we don't have enough similar questions, add common ones
      const commonQuestions = [
        "What's the estimated ARV for this property?",
        "How much should I budget for renovations?",
        "What contractors are available in this area?",
        "Is this property a good investment opportunity?",
        "What's the average ROI for properties in this neighborhood?",
        "Can you analyze the comparable properties?",
        "What are the main renovation items needed?",
        "How long will the renovation take?",
        "What's the best financing option for this project?",
        "Are there any liens or title issues?"
      ];

      // Add common questions if needed
      while (similarQuestions.length < 3) {
        const randomQuestion = commonQuestions[Math.floor(Math.random() * commonQuestions.length)];
        if (!similarQuestions.includes(randomQuestion)) {
          similarQuestions.push(randomQuestion);
        }
      }

      res.json({
        success: true,
        questions: similarQuestions.slice(0, 3)
      });

    } catch (error) {
      console.error('Similar questions error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get similar questions',
        details: error.message 
      });
    }
  }

  /**
   * Clear a conversation
   */
  async clearConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      const conversation = conversations.get(conversationId);
      
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found'
        });
      }

      if (conversation.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Remove from memory
      conversations.delete(conversationId);

      res.json({
        success: true,
        message: 'Conversation cleared successfully'
      });

    } catch (error) {
      console.error('Clear conversation error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to clear conversation',
        details: error.message 
      });
    }
  }

  /**
   * Get all conversations for a user (optional endpoint)
   */
  async getUserConversations(req, res) {
    try {
      const userId = req.user.id;
      
      const userConversations = Array.from(conversations.values())
        .filter(conv => conv.userId === userId)
        .map(conv => ({
          id: conv.id,
          createdAt: conv.createdAt,
          lastActivity: conv.lastActivity,
          messageCount: conv.messages.length,
          preview: conv.messages[conv.messages.length - 1]?.content.substring(0, 100) + '...'
        }))
        .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

      res.json({
        success: true,
        conversations: userConversations
      });

    } catch (error) {
      console.error('Get user conversations error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to retrieve conversations',
        details: error.message 
      });
    }
  }
}

module.exports = new ChatController();
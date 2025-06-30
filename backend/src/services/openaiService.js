// backend/src/services/openaiService.js
// Complete updated version with all methods

const { OpenAI } = require('openai');

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    console.log('✅ OpenAI service initialized with API key');
  }

  /**
   * Extract structured data from text using GPT
   */
  async extractStructuredData(prompt) {
    try {
      console.log('🤖 Calling OpenAI for structured data extraction...');
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a real estate data extraction expert. Extract structured data from documents and return valid JSON. 
            
            IMPORTANT RULES:
            1. Return ONLY valid JSON, no other text or explanations
            2. Use null for missing values, never use undefined or empty strings for numbers
            3. Ensure all numeric fields are actual numbers, not strings
            4. If you cannot find specific information, use reasonable defaults or null
            5. Always include a confidence object with scores 0-1 for key fields
            
            Expected fields:
            - address (string)
            - beds (number)
            - baths (number)
            - squareFootage (number)
            - listingPrice (number)
            - estimatedARV (number)
            - taxAssessment (number)
            - propertyType (string: "Single Family", "Condo", "Townhouse", "Multi-Family")
            - yearBuilt (number)
            - lienStatus (string: "Clear", "Unknown", "Existing Liens")
            - roofAge (number in years)
            - kitchenCondition (string: "Excellent", "Good", "Fair", "Poor")
            - bathroomCondition (string: "Excellent", "Good", "Fair", "Poor")
            - infrastructureScore (number 0-100)
            - confidence (object with field names as keys and confidence scores 0-1 as values)`
          },
          {
            role: 'user',
            content: prompt + '\n\nRespond with ONLY valid JSON.'
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const content = response.choices[0].message.content;
      
      try {
        const parsed = JSON.parse(content);
        console.log('✅ Successfully parsed structured data');
        return parsed;
      } catch (parseError) {
        console.error('Failed to parse OpenAI response as JSON:', content);
        // Try to extract JSON from the response if it contains other text
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0]);
          } catch (secondParseError) {
            throw new Error('Invalid JSON response from OpenAI');
          }
        }
        throw new Error('Invalid JSON response from OpenAI');
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for text using OpenAI
   */
  async embedText(text) {
    try {
      console.log(`🔢 Getting embedding for text (${text.length} chars)...`);
      
      // Truncate text if too long (max ~8000 tokens)
      const maxChars = 30000;
      const truncatedText = text.length > maxChars 
        ? text.substring(0, maxChars) + '...' 
        : text;
      
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: truncatedText,
      });

      const embedding = response.data[0].embedding;
      console.log(`✅ Successfully generated embedding (${embedding.length} dimensions)`);
      
      return embedding;
    } catch (error) {
      console.error('Embedding error:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate chat response with context
   */
  async generateResponse(messages, systemPrompt) {
    try {
      console.log('🤖 Generating chat response...');
      
      // Ensure messages don't exceed token limit
      const recentMessages = messages.slice(-10); // Keep last 10 messages
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...recentMessages
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const reply = response.choices[0].message.content;
      console.log('✅ Successfully generated response');
      
      return reply;
    } catch (error) {
      console.error('Chat generation error:', error);
      throw new Error(`Failed to generate response: ${error.message}`);
    }
  }

  /**
   * Generate ROI analysis for property investment
   */
  async generateROIAnalysis(propertyData, rehabItems) {
    try {
      console.log('📊 Generating ROI analysis...');
      
      const prompt = `Analyze this real estate investment opportunity:
      
      Property Details:
      ${JSON.stringify(propertyData, null, 2)}
      
      Renovation Scope:
      ${JSON.stringify(rehabItems, null, 2)}
      
      Provide a detailed ROI analysis including:
      1. Total investment required (purchase + renovation + holding costs)
      2. Expected ARV (After Repair Value) based on market conditions
      3. Projected ROI percentage
      4. Key risks (list 3-5 specific risks)
      5. Key opportunities (list 3-5 specific opportunities)
      6. Recommended holding period
      7. Break-even analysis
      8. Cash flow projections
      
      Return as JSON with these fields: 
      {
        "totalInvestment": number,
        "purchasePrice": number,
        "renovationCost": number,
        "holdingCosts": number,
        "expectedARV": number,
        "projectedROI": number (percentage),
        "netProfit": number,
        "risks": string[],
        "opportunities": string[],
        "holdingPeriod": string,
        "breakEvenMonths": number,
        "monthlyCarryingCost": number,
        "confidence": number (0-1)
      }`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an experienced real estate investment analyst. Provide data-driven, conservative analysis based on the provided information. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      });

      const content = response.choices[0].message.content;
      
      try {
        const analysis = JSON.parse(content);
        console.log('✅ Successfully generated ROI analysis');
        return analysis;
      } catch (error) {
        console.error('Failed to parse ROI analysis:', content);
        // Return a default structure if parsing fails
        return {
          totalInvestment: propertyData.listingPrice || 0,
          purchasePrice: propertyData.listingPrice || 0,
          renovationCost: 0,
          holdingCosts: 0,
          expectedARV: propertyData.estimatedARV || 0,
          projectedROI: 0,
          netProfit: 0,
          risks: ['Unable to analyze - parsing error'],
          opportunities: ['Unable to analyze - parsing error'],
          holdingPeriod: '6-12 months',
          breakEvenMonths: 0,
          monthlyCarryingCost: 0,
          confidence: 0.1
        };
      }
    } catch (error) {
      console.error('ROI analysis error:', error);
      throw error;
    }
  }

  /**
   * Generate contractor matching criteria
   */
  async generateContractorCriteria(rehabScope, propertyData) {
    try {
      console.log('🔨 Generating contractor criteria...');
      
      const prompt = `Based on this renovation scope and property, determine the ideal contractor requirements:
      
      Property: ${propertyData.address || 'Unknown address'}
      Renovation Items: ${JSON.stringify(rehabScope, null, 2)}
      
      Return JSON with:
      {
        "requiredSkills": string[],
        "requiredLicenses": string[],
        "minimumExperience": number (years),
        "projectComplexity": "Low" | "Medium" | "High",
        "estimatedDuration": string,
        "specialRequirements": string[]
      }`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a construction project manager. Analyze the renovation scope and determine contractor requirements.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 400
      });

      try {
        return JSON.parse(response.choices[0].message.content);
      } catch (error) {
        return {
          requiredSkills: ['General Construction'],
          requiredLicenses: ['General Contractor'],
          minimumExperience: 3,
          projectComplexity: 'Medium',
          estimatedDuration: '2-3 months',
          specialRequirements: []
        };
      }
    } catch (error) {
      console.error('Contractor criteria error:', error);
      throw error;
    }
  }

  /**
   * Summarize document text
   */
  async summarizeDocument(text, maxLength = 200) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Summarize the following text concisely, focusing on key real estate information like property details, price, condition, and location.'
          },
          {
            role: 'user',
            content: `Summarize in ${maxLength} characters or less:\n\n${text}`
          }
        ],
        temperature: 0.5,
        max_tokens: 100
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Summarization error:', error);
      return text.substring(0, maxLength) + '...';
    }
  }

  /**
   * Generate property description for fact sheet
   */
  async generatePropertyDescription(propertyData) {
    try {
      const prompt = `Create a professional property description for a fact sheet based on:
      ${JSON.stringify(propertyData, null, 2)}
      
      Write 2-3 sentences highlighting key features and investment potential.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a real estate marketing expert. Write compelling, accurate property descriptions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        max_tokens: 150
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Property description error:', error);
      return `This ${propertyData.propertyType || 'property'} features ${propertyData.beds || 'multiple'} bedrooms and ${propertyData.baths || 'multiple'} bathrooms with ${propertyData.squareFootage || 'ample'} square feet of living space.`;
    }
  }

  /**
   * Generate email content for contractor RFPs
   */
  async generateRFPEmail(contractorName, propertyAddress, rehabScope, timeline) {
    try {
      const prompt = `Create a professional RFP email for a contractor. Details:
      - Contractor: ${contractorName}
      - Property: ${propertyAddress}
      - Renovation scope: ${JSON.stringify(rehabScope, null, 2)}
      - Timeline: ${timeline}
      
      Keep it professional, concise, and include a call to action for submitting a bid.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a real estate investor writing to contractors. Be professional and clear about project requirements.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 300
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('RFP email generation error:', error);
      return `Dear ${contractorName},\n\nWe have a renovation project at ${propertyAddress} and would like to request a bid. Please review the attached scope of work and provide your detailed estimate.\n\nBest regards`;
    }
  }

  /**
   * Validate and enhance extracted data
   */
  async validateExtractedData(data) {
    try {
      const prompt = `Validate and enhance this extracted real estate data. Fix any obvious errors, ensure consistency, and fill in reasonable defaults where appropriate:
      ${JSON.stringify(data, null, 2)}
      
      Return the corrected JSON with the same structure.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a data validation expert. Ensure all real estate data is consistent and reasonable.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 500
      });

      try {
        return JSON.parse(response.choices[0].message.content);
      } catch (error) {
        return data; // Return original if parsing fails
      }
    } catch (error) {
      console.error('Data validation error:', error);
      return data; // Return original on error
    }
  }
}

// Export singleton instance
module.exports = new OpenAIService();
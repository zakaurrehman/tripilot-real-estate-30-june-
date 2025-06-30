// backend/src/config/database.js
// Mock database for demo - replace with Prisma/PostgreSQL in production

const { v4: uuidv4 } = require('uuid');

// In-memory storage
const documents = new Map();
const users = new Map();
const lapisTransactions = new Map();
const rehabScopes = new Map();
const factSheets = new Map();
const contractors = new Map();

// Initialize with demo user
const demoUserId = 'demo-user-123';
users.set(demoUserId, {
  id: demoUserId,
  email: 'demo@tripilot.com',
  name: 'Demo User',
  lapisUsed: 0,
  lapisTotal: 210,
  subscription: 'trial',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date()
});

// Add some demo contractors
const demoContractors = [
  {
    id: 'contractor-1',
    name: 'ABC Construction LLC',
    email: 'contact@abcconstruction.com',
    phone: '(555) 123-4567',
    specialties: ['Kitchen', 'Bathroom', 'General'],
    rating: 4.5,
    yearsInBusiness: 12,
    license: 'GC-123456',
    location: 'Los Angeles, CA'
  },
  {
    id: 'contractor-2',
    name: 'Premier Renovations',
    email: 'info@premierreno.com',
    phone: '(555) 234-5678',
    specialties: ['Whole House', 'Additions', 'Structural'],
    rating: 4.8,
    yearsInBusiness: 8,
    license: 'GC-234567',
    location: 'Los Angeles, CA'
  },
  {
    id: 'contractor-3',
    name: 'Quality Home Builders',
    email: 'quotes@qualityhomes.com',
    phone: '(555) 345-6789',
    specialties: ['Roofing', 'Exterior', 'Foundation'],
    rating: 4.3,
    yearsInBusiness: 15,
    license: 'GC-345678',
    location: 'Los Angeles, CA'
  }
];

demoContractors.forEach(c => contractors.set(c.id, c));

// Database mock implementation
const db = {
  // Document model
  document: {
    create: async ({ data }) => {
      const doc = { 
        ...data, 
        id: data.id || uuidv4(),
        createdAt: data.createdAt || new Date(),
        updatedAt: new Date()
      };
      documents.set(doc.id, doc);
      console.log(`📄 Created document: ${doc.id}`);
      return doc;
    },
    
    findUnique: async ({ where, select }) => {
      const doc = documents.get(where.id);
      if (!doc) return null;
      
      if (select) {
        const result = { id: doc.id };
        Object.keys(select).forEach(key => {
          if (select[key] && doc[key] !== undefined) {
            result[key] = doc[key];
          }
        });
        return result;
      }
      
      return doc;
    },
    
    findFirst: async ({ where, select }) => {
      for (const doc of documents.values()) {
        let matches = true;
        
        if (where.userId && doc.userId !== where.userId) matches = false;
        if (where.id && doc.id !== where.id) matches = false;
        if (where.status && doc.status !== where.status) matches = false;
        
        if (matches) {
          if (select) {
            const result = { id: doc.id };
            Object.keys(select).forEach(key => {
              if (select[key] && doc[key] !== undefined) {
                result[key] = doc[key];
              }
            });
            return result;
          }
          return doc;
        }
      }
      return null;
    },
    
    findMany: async ({ where = {}, select, orderBy, take }) => {
      let results = Array.from(documents.values());
      
      // Apply filters
      if (where.userId) {
        results = results.filter(doc => doc.userId === where.userId);
      }
      
      if (where.id?.in) {
        results = results.filter(doc => where.id.in.includes(doc.id));
      }
      
      if (where.status) {
        results = results.filter(doc => doc.status === where.status);
      }
      
      // Apply ordering
      if (orderBy) {
        const field = Object.keys(orderBy)[0];
        const direction = orderBy[field];
        
        results.sort((a, b) => {
          if (direction === 'desc') {
            return b[field] > a[field] ? 1 : -1;
          }
          return a[field] > b[field] ? 1 : -1;
        });
      }
      
      // Apply limit
      if (take) {
        results = results.slice(0, take);
      }
      
      // Apply selection
      if (select) {
        results = results.map(doc => {
          const result = { id: doc.id };
          Object.keys(select).forEach(key => {
            if (select[key] && doc[key] !== undefined) {
              result[key] = doc[key];
            }
          });
          return result;
        });
      }
      
      return results;
    },
    
    update: async ({ where, data }) => {
      const doc = documents.get(where.id);
      if (!doc) throw new Error('Document not found');
      
      const updated = { 
        ...doc, 
        ...data,
        updatedAt: new Date()
      };
      documents.set(where.id, updated);
      console.log(`📝 Updated document: ${where.id}`);
      return updated;
    },
    
    delete: async ({ where }) => {
      const doc = documents.get(where.id);
      if (!doc) throw new Error('Document not found');
      
      documents.delete(where.id);
      console.log(`🗑️ Deleted document: ${where.id}`);
      return doc;
    },
    
    count: async ({ where = {} }) => {
      let count = 0;
      for (const doc of documents.values()) {
        let matches = true;
        
        if (where.userId && doc.userId !== where.userId) matches = false;
        if (where.status && doc.status !== where.status) matches = false;
        
        if (matches) count++;
      }
      return count;
    }
  },
  
  // User model
  user: {
    create: async ({ data }) => {
      const user = { 
        ...data, 
        id: data.id || uuidv4(),
        createdAt: data.createdAt || new Date(),
        updatedAt: new Date(),
        lapisUsed: data.lapisUsed || 0,
        lapisTotal: data.lapisTotal || 30
      };
      users.set(user.id, user);
      return user;
    },
    
    findUnique: async ({ where, select }) => {
      let user = null;
      
      if (where.id) {
        user = users.get(where.id);
      } else if (where.email) {
        user = Array.from(users.values()).find(u => u.email === where.email);
      }
      
      if (!user) return null;
      
      if (select) {
        const result = {};
        Object.keys(select).forEach(key => {
          if (select[key] && user[key] !== undefined) {
            result[key] = user[key];
          }
        });
        return result;
      }
      
      return user;
    },
    
    update: async ({ where, data }) => {
      const user = users.get(where.id);
      if (!user) throw new Error('User not found');
      
      const updated = { 
        ...user, 
        ...data,
        updatedAt: new Date()
      };
      users.set(where.id, updated);
      return updated;
    },
    
    delete: async ({ where }) => {
      const user = users.get(where.id);
      if (!user) throw new Error('User not found');
      
      users.delete(where.id);
      return user;
    }
  },
  
  // Lapis Transaction model
  lapisTransaction: {
    create: async ({ data }) => {
      const transaction = { 
        ...data, 
        id: data.id || uuidv4(),
        timestamp: data.timestamp || new Date()
      };
      lapisTransactions.set(transaction.id, transaction);
      
      // Update user's lapis balance
      const user = users.get(data.userId);
      if (user) {
        if (data.amount < 0) {
          // Usage
          user.lapisUsed += Math.abs(data.amount);
        } else {
          // Top-up
          user.lapisTotal += data.amount;
        }
        users.set(user.id, user);
      }
      
      return transaction;
    },
    
    findMany: async ({ where = {}, select, orderBy }) => {
      let results = Array.from(lapisTransactions.values());
      
      if (where.userId) {
        results = results.filter(t => t.userId === where.userId);
      }
      
      if (where.taskType) {
        results = results.filter(t => t.taskType === where.taskType);
      }
      
      if (orderBy?.timestamp) {
        results.sort((a, b) => {
          if (orderBy.timestamp === 'desc') {
            return new Date(b.timestamp) - new Date(a.timestamp);
          }
          return new Date(a.timestamp) - new Date(b.timestamp);
        });
      }
      
      if (select) {
        results = results.map(t => {
          const result = {};
          Object.keys(select).forEach(key => {
            if (select[key] && t[key] !== undefined) {
              result[key] = t[key];
            }
          });
          return result;
        });
      }
      
      return results;
    }
  },
  
  // Rehab Scope model
  rehabScope: {
    create: async ({ data }) => {
      const scope = { 
        ...data, 
        id: data.id || uuidv4(),
        createdAt: data.createdAt || new Date(),
        updatedAt: new Date()
      };
      rehabScopes.set(scope.id, scope);
      return scope;
    },
    
    findUnique: async ({ where }) => {
      return rehabScopes.get(where.id);
    },
    
    findMany: async ({ where = {} }) => {
      let results = Array.from(rehabScopes.values());
      
      if (where.userId) {
        results = results.filter(s => s.userId === where.userId);
      }
      
      if (where.propertyId) {
        results = results.filter(s => s.propertyId === where.propertyId);
      }
      
      return results;
    },
    
    update: async ({ where, data }) => {
      const scope = rehabScopes.get(where.id);
      if (!scope) throw new Error('Rehab scope not found');
      
      const updated = { 
        ...scope, 
        ...data,
        updatedAt: new Date()
      };
      rehabScopes.set(where.id, updated);
      return updated;
    },
    
    delete: async ({ where }) => {
      const scope = rehabScopes.get(where.id);
      if (!scope) throw new Error('Rehab scope not found');
      
      rehabScopes.delete(where.id);
      return scope;
    }
  },
  
  // Fact Sheet model
  factSheet: {
    create: async ({ data }) => {
      const sheet = { 
        ...data, 
        id: data.id || uuidv4(),
        createdAt: data.createdAt || new Date()
      };
      factSheets.set(sheet.id, sheet);
      return sheet;
    },
    
    findMany: async ({ where = {}, orderBy }) => {
      let results = Array.from(factSheets.values());
      
      if (where.userId) {
        results = results.filter(s => s.userId === where.userId);
      }
      
      if (where.propertyId) {
        results = results.filter(s => s.propertyId === where.propertyId);
      }
      
      if (orderBy?.createdAt) {
        results.sort((a, b) => {
          if (orderBy.createdAt === 'desc') {
            return new Date(b.createdAt) - new Date(a.createdAt);
          }
          return new Date(a.createdAt) - new Date(b.createdAt);
        });
      }
      
      return results;
    }
  },
  
  // Contractor model
  contractor: {
    findMany: async ({ where = {} }) => {
      let results = Array.from(contractors.values());
      
      if (where.location) {
        results = results.filter(c => 
          c.location.toLowerCase().includes(where.location.toLowerCase())
        );
      }
      
      if (where.specialties?.hasSome) {
        results = results.filter(c => 
          c.specialties.some(s => where.specialties.hasSome.includes(s))
        );
      }
      
      if (where.rating?.gte) {
        results = results.filter(c => c.rating >= where.rating.gte);
      }
      
      return results;
    },
    
    findUnique: async ({ where }) => {
      return contractors.get(where.id);
    }
  },
  
  // Transaction helper for atomic operations
  $transaction: async (operations) => {
    // Simple implementation - just run operations sequentially
    const results = [];
    for (const op of operations) {
      results.push(await op);
    }
    return results;
  }
};

// Export the mock database
module.exports = db;
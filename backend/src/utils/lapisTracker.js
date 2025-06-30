// backend/src/utils/lapisTracker.js

const db = require('../config/database');

const LAPIS_COSTS = {
  search: 2,
  automate: 8,
  snapshot: 1
};

class LapisTracker {
  async trackUsage(userId, taskType, multiplier = 1) {
    const cost = LAPIS_COSTS[taskType] * multiplier;
    
    try {
      // Get current usage
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          lapisUsed: true,
          lapisTotal: true,
          subscription: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const newUsage = user.lapisUsed + cost;
      const remaining = user.lapisTotal - newUsage;

      // Check if user has enough credits
      if (remaining < 0) {
        throw new Error('Insufficient Lapis credits');
      }

      // Update usage
      await db.user.update({
        where: { id: userId },
        data: {
          lapisUsed: newUsage
        }
      });

      // Log transaction
      await db.lapisTransaction.create({
        data: {
          userId,
          taskType,
          amount: -cost,
          balance: remaining,
          description: `${taskType} task executed`
        }
      });

      return {
        used: cost,
        remaining,
        total: user.lapisTotal
      };

    } catch (error) {
      console.error('Lapis tracking error:', error);
      throw error;
    }
  }

  async getUsage(userId) {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          lapisUsed: true,
          lapisTotal: true
        }
      });

      if (!user) {
        // Default for demo
        return {
          search: 0,
          automate: 0,
          snapshot: 0,
          remaining: 210,
          total: 210
        };
      }

      // Get breakdown by task type
      const transactions = await db.lapisTransaction.findMany({
        where: { userId },
        select: {
          taskType: true,
          amount: true
        }
      });

      const breakdown = transactions.reduce((acc, t) => {
        acc[t.taskType] = (acc[t.taskType] || 0) + Math.abs(t.amount);
        return acc;
      }, {});

      return {
        search: breakdown.search || 0,
        automate: breakdown.automate || 0,
        snapshot: breakdown.snapshot || 0,
        remaining: user.lapisTotal - user.lapisUsed,
        total: user.lapisTotal
      };

    } catch (error) {
      console.error('Get usage error:', error);
      // Return default for demo
      return {
        search: 0,
        automate: 0,
        snapshot: 0,
        remaining: 210,
        total: 210
      };
    }
  }

  async addCredits(userId, amount, description) {
    try {
      const user = await db.user.update({
        where: { id: userId },
        data: {
          lapisTotal: {
            increment: amount
          }
        }
      });

      await db.lapisTransaction.create({
        data: {
          userId,
          taskType: 'credit',
          amount,
          balance: user.lapisTotal - user.lapisUsed,
          description
        }
      });

      return {
        success: true,
        newTotal: user.lapisTotal,
        remaining: user.lapisTotal - user.lapisUsed
      };

    } catch (error) {
      console.error('Add credits error:', error);
      throw error;
    }
  }
}

module.exports = new LapisTracker();
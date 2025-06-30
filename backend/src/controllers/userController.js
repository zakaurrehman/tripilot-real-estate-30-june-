// backend/src/controllers/userController.js - COMPLETE UPDATED VERSION

const db = require('../config/database');
const { trackLapisUsage } = require('../utils/lapisTracker');

class UserController {
  async getLapisUsage(req, res) {
    try {
      const userId = req.user.id;
      
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          lapisUsed: true,
          lapisTotal: true,
          subscription: true
        }
      });

      if (!user) {
        // Return default for demo user
        return res.json({
          search: 0,
          automate: 0,
          snapshot: 0,
          remaining: 210,
          total: 210
        });
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
        if (t.amount < 0) { // Only count usage, not top-ups
          acc[t.taskType] = (acc[t.taskType] || 0) + Math.abs(t.amount);
        }
        return acc;
      }, {});

      res.json({
        search: breakdown.search || 0,
        automate: breakdown.automate || 0,
        snapshot: breakdown.snapshot || 0,
        remaining: user.lapisTotal - user.lapisUsed,
        total: user.lapisTotal
      });
    } catch (error) {
      console.error('Get lapis usage error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get usage data',
        details: error.message 
      });
    }
  }

  async topUpLapis(req, res) {
    try {
      const { amount } = req.body;
      const userId = req.user.id;

      if (!amount || amount < 1) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid amount. Minimum top-up is $1.' 
        });
      }

      if (amount > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Maximum top-up is $1000 per transaction.'
        });
      }

      // In production, integrate with Stripe here
      const lapisCredits = Math.floor(amount * 2.5); // $1 = 2.5 Lapis

      const user = await db.user.update({
        where: { id: userId },
        data: {
          lapisTotal: {
            increment: lapisCredits
          }
        }
      });

      // Record transaction
      await db.lapisTransaction.create({
        data: {
          userId,
          taskType: 'top_up',
          amount: lapisCredits,
          balance: user.lapisTotal - user.lapisUsed,
          description: `Top-up: $${amount} → ${lapisCredits} Lapis`
        }
      });

      res.json({
        success: true,
        message: `Added ${lapisCredits} Lapis credits`,
        newTotal: user.lapisTotal,
        remaining: user.lapisTotal - user.lapisUsed,
        creditsAdded: lapisCredits
      });
    } catch (error) {
      console.error('Top-up error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to process top-up',
        details: error.message 
      });
    }
  }

  async upgradeSubscription(req, res) {
    try {
      const { plan } = req.body;
      const userId = req.user.id;

      const planDetails = {
        'starter': { 
          price: 499, 
          lapis: 400, 
          name: 'FlipPro Starter',
          features: ['Search', 'Automate', 'Snapshot', 'One free GC-Match bid-package per month']
        },
        'pro': { 
          price: 549, 
          lapis: 450, 
          name: 'SpendGuard Pro',
          features: ['All Starter features', 'Auto-export reconciled disputes to ERP', 'Priority support']
        },
        'enterprise': { 
          price: 599, 
          lapis: 500, 
          name: 'ControlMap Core',
          features: ['All Pro features', 'Unlimited Jira control-tickets', 'Two-way sync', 'Custom integrations']
        }
      };

      if (!planDetails[plan]) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid plan. Available plans: starter, pro, enterprise' 
        });
      }

      // In production, integrate with Stripe here
      const planInfo = planDetails[plan];

      const updatedUser = await db.user.update({
        where: { id: userId },
        data: {
          subscription: plan,
          lapisTotal: planInfo.lapis,
          lapisUsed: 0 // Reset usage for new billing cycle
        }
      });

      // Record subscription change
      await db.lapisTransaction.create({
        data: {
          userId,
          taskType: 'subscription',
          amount: planInfo.lapis,
          balance: planInfo.lapis,
          description: `Subscription upgrade to ${planInfo.name}`
        }
      });

      res.json({
        success: true,
        message: `Successfully upgraded to ${planInfo.name}`,
        plan: {
          ...planInfo,
          type: plan
        },
        user: {
          subscription: updatedUser.subscription,
          lapisTotal: updatedUser.lapisTotal,
          lapisUsed: updatedUser.lapisUsed
        }
      });
    } catch (error) {
      console.error('Upgrade error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to upgrade subscription',
        details: error.message 
      });
    }
  }

  async getProfile(req, res) {
    try {
      const userId = req.user.id;
      
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          subscription: true,
          lapisUsed: true,
          lapisTotal: true,
          verticalType: true,
          createdAt: true
        }
      });

      if (!user) {
        return res.status(404).json({ 
          success: false,
          error: 'User not found' 
        });
      }

      // Get recent transactions
      const recentTransactions = await db.lapisTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          taskType: true,
          amount: true,
          description: true,
          createdAt: true
        }
      });

      res.json({
        success: true,
        user: {
          ...user,
          remaining: user.lapisTotal - user.lapisUsed
        },
        recentTransactions
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get user profile',
        details: error.message 
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { email, verticalType } = req.body;

      const updateData = {};
      if (email) updateData.email = email;
      if (verticalType) updateData.verticalType = verticalType;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid fields to update'
        });
      }

      const updatedUser = await db.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          subscription: true,
          verticalType: true,
          updatedAt: true
        }
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
        details: error.message
      });
    }
  }

  async getUsageStats(req, res) {
    try {
      const userId = req.user.id;
      const { period = '30d' } = req.query;

      let dateFilter = new Date();
      switch (period) {
        case '7d':
          dateFilter.setDate(dateFilter.getDate() - 7);
          break;
        case '30d':
          dateFilter.setDate(dateFilter.getDate() - 30);
          break;
        case '90d':
          dateFilter.setDate(dateFilter.getDate() - 90);
          break;
        default:
          dateFilter.setDate(dateFilter.getDate() - 30);
      }

      const transactions = await db.lapisTransaction.findMany({
        where: {
          userId,
          createdAt: { gte: dateFilter },
          amount: { lt: 0 } // Only usage transactions
        },
        select: {
          taskType: true,
          amount: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      // Group by task type
      const taskUsage = transactions.reduce((acc, t) => {
        acc[t.taskType] = (acc[t.taskType] || 0) + Math.abs(t.amount);
        return acc;
      }, {});

      // Group by day for chart data
      const dailyUsage = transactions.reduce((acc, t) => {
        const day = t.createdAt.toISOString().split('T')[0];
        acc[day] = (acc[day] || 0) + Math.abs(t.amount);
        return acc;
      }, {});

      res.json({
        success: true,
        period,
        taskUsage,
        dailyUsage,
        totalUsage: Object.values(taskUsage).reduce((sum, val) => sum + val, 0),
        transactionCount: transactions.length
      });
    } catch (error) {
      console.error('Get usage stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get usage statistics',
        details: error.message
      });
    }
  }
}

module.exports = new UserController();
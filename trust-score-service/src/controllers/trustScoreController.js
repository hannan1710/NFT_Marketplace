/**
 * Trust Score Controller
 * Handles HTTP requests for trust score operations
 */

const TrustScore = require('../models/TrustScore');
const TrustScoreCalculator = require('../services/TrustScoreCalculator');
const logger = require('../utils/logger');
const axios = require('axios');

const calculator = new TrustScoreCalculator({
  transactions: parseFloat(process.env.WEIGHT_TRANSACTIONS) || 0.25,
  disputes: parseFloat(process.env.WEIGHT_DISPUTES) || 0.20,
  accountAge: parseFloat(process.env.WEIGHT_ACCOUNT_AGE) || 0.15,
  fraudHistory: parseFloat(process.env.WEIGHT_FRAUD_HISTORY) || 0.25,
  behavioral: parseFloat(process.env.WEIGHT_BEHAVIORAL) || 0.15
});

/**
 * GET /trust-score/:wallet
 * Get trust score for a wallet
 */
exports.getTrustScore = async (req, res) => {
  try {
    const { wallet } = req.params;
    
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address'
      });
    }
    
    let trustScore = await TrustScore.findByWallet(wallet);
    
    if (!trustScore) {
      // Create new trust score with default values
      trustScore = new TrustScore({
        walletAddress: wallet.toLowerCase()
      });
      
      // Calculate initial scores
      const scores = calculator.calculateAllScores(trustScore);
      trustScore.trustScore = scores.trustScore;
      trustScore.trustLevel = scores.trustLevel;
      trustScore.factorScores = scores.factorScores;
      
      await trustScore.save();
    }
    
    res.json({
      success: true,
      data: {
        walletAddress: trustScore.walletAddress,
        trustScore: trustScore.trustScore,
        trustLevel: trustScore.trustLevel,
        factorScores: trustScore.factorScores,
        isBlacklisted: trustScore.isBlacklisted,
        blacklistReason: trustScore.blacklistReason,
        lastUpdated: trustScore.lastUpdated,
        accountAge: {
          ageInDays: trustScore.accountAge.ageInDays,
          isVerified: trustScore.accountAge.isVerified
        },
        statistics: {
          totalTransactions: trustScore.successfulTransactions.count,
          totalValue: trustScore.successfulTransactions.totalValue,
          totalDisputes: trustScore.disputes.total,
          openDisputes: trustScore.disputes.open,
          fraudIncidents: trustScore.fraudHistory.totalIncidents
        }
      }
    });
  } catch (error) {
    logger.error('Error getting trust score:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * GET /trust-score/:wallet/detailed
 * Get detailed trust score with all data
 */
exports.getDetailedTrustScore = async (req, res) => {
  try {
    const { wallet } = req.params;
    
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address'
      });
    }
    
    const trustScore = await TrustScore.findByWallet(wallet);
    
    if (!trustScore) {
      return res.status(404).json({
        success: false,
        error: 'Trust score not found'
      });
    }
    
    res.json({
      success: true,
      data: trustScore
    });
  } catch (error) {
    logger.error('Error getting detailed trust score:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * POST /trust-score/:wallet/transaction
 * Add a transaction and update trust score
 */
exports.addTransaction = async (req, res) => {
  try {
    const { wallet } = req.params;
    const { transactionHash, type, amount, timestamp } = req.body;
    
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address'
      });
    }
    
    let trustScore = await TrustScore.findByWallet(wallet);
    
    if (!trustScore) {
      trustScore = new TrustScore({
        walletAddress: wallet.toLowerCase()
      });
    }
    
    // Add transaction
    trustScore.addTransaction({
      transactionHash,
      type,
      amount: amount || 0,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      successful: true
    });
    
    // Update account age
    if (!trustScore.accountAge.firstTransactionDate) {
      trustScore.accountAge.firstTransactionDate = new Date(timestamp || Date.now());
    }
    const ageInDays = Math.floor(
      (Date.now() - trustScore.accountAge.firstTransactionDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    trustScore.accountAge.ageInDays = ageInDays;
    
    // Update behavioral metrics
    trustScore.behavioralMetrics = calculator.updateBehavioralMetrics(trustScore);
    
    // Recalculate scores
    const scores = calculator.calculateAllScores(trustScore);
    trustScore.trustScore = scores.trustScore;
    trustScore.trustLevel = scores.trustLevel;
    trustScore.factorScores = scores.factorScores;
    
    await trustScore.save();
    
    res.json({
      success: true,
      data: {
        walletAddress: trustScore.walletAddress,
        trustScore: trustScore.trustScore,
        trustLevel: trustScore.trustLevel,
        factorScores: trustScore.factorScores
      }
    });
  } catch (error) {
    logger.error('Error adding transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * POST /trust-score/:wallet/dispute
 * Add a dispute and update trust score
 */
exports.addDispute = async (req, res) => {
  try {
    const { wallet } = req.params;
    const { disputeId, type, severity, status } = req.body;
    
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address'
      });
    }
    
    let trustScore = await TrustScore.findByWallet(wallet);
    
    if (!trustScore) {
      return res.status(404).json({
        success: false,
        error: 'Trust score not found. Create wallet first by adding a transaction.'
      });
    }
    
    // Add dispute
    trustScore.addDispute({
      disputeId,
      type,
      severity: severity || 'medium',
      status: status || 'open',
      timestamp: new Date()
    });
    
    // Recalculate scores
    const scores = calculator.calculateAllScores(trustScore);
    trustScore.trustScore = scores.trustScore;
    trustScore.trustLevel = scores.trustLevel;
    trustScore.factorScores = scores.factorScores;
    
    await trustScore.save();
    
    res.json({
      success: true,
      data: {
        walletAddress: trustScore.walletAddress,
        trustScore: trustScore.trustScore,
        trustLevel: trustScore.trustLevel,
        factorScores: trustScore.factorScores
      }
    });
  } catch (error) {
    logger.error('Error adding dispute:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * POST /trust-score/:wallet/fraud-check
 * Check wallet with fraud detection service and update score
 */
exports.checkFraud = async (req, res) => {
  try {
    const { wallet } = req.params;
    const { transaction } = req.body;
    
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address'
      });
    }
    
    // Call fraud detection service
    const fraudDetectorUrl = process.env.FRAUD_DETECTOR_URL || 'http://localhost:8000';
    
    try {
      const response = await axios.post(`${fraudDetectorUrl}/risk-score`, {
        transaction: transaction || {
          nft_id: 'check',
          seller: wallet,
          buyer: wallet,
          price: 0
        }
      });
      
      const fraudResult = response.data;
      
      // Update trust score if fraud detected
      if (fraudResult.fraud_detected) {
        let trustScore = await TrustScore.findByWallet(wallet);
        
        if (!trustScore) {
          trustScore = new TrustScore({
            walletAddress: wallet.toLowerCase()
          });
        }
        
        // Add fraud incident
        trustScore.addFraudIncident({
          incidentId: `fraud_${Date.now()}`,
          type: fraudResult.flags[0] || 'other',
          riskScore: fraudResult.risk_score,
          flags: fraudResult.flags,
          timestamp: new Date(),
          verified: fraudResult.risk_score >= 70
        });
        
        // Recalculate scores
        const scores = calculator.calculateAllScores(trustScore);
        trustScore.trustScore = scores.trustScore;
        trustScore.trustLevel = scores.trustLevel;
        trustScore.factorScores = scores.factorScores;
        
        await trustScore.save();
      }
      
      res.json({
        success: true,
        data: {
          fraudDetected: fraudResult.fraud_detected,
          riskScore: fraudResult.risk_score,
          flags: fraudResult.flags,
          trustScoreUpdated: fraudResult.fraud_detected
        }
      });
    } catch (fraudError) {
      logger.error('Error calling fraud detection service:', fraudError);
      res.status(503).json({
        success: false,
        error: 'Fraud detection service unavailable'
      });
    }
  } catch (error) {
    logger.error('Error checking fraud:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * GET /trust-score/top
 * Get top trusted wallets
 */
exports.getTopTrusted = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const topWallets = await TrustScore.getTopTrustedWallets(limit);
    
    res.json({
      success: true,
      data: topWallets
    });
  } catch (error) {
    logger.error('Error getting top trusted wallets:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * GET /trust-score/blacklisted
 * Get blacklisted wallets
 */
exports.getBlacklisted = async (req, res) => {
  try {
    const blacklisted = await TrustScore.getBlacklistedWallets();
    
    res.json({
      success: true,
      data: blacklisted
    });
  } catch (error) {
    logger.error('Error getting blacklisted wallets:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * POST /trust-score/:wallet/blacklist
 * Blacklist a wallet
 */
exports.blacklistWallet = async (req, res) => {
  try {
    const { wallet } = req.params;
    const { reason } = req.body;
    
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address'
      });
    }
    
    let trustScore = await TrustScore.findByWallet(wallet);
    
    if (!trustScore) {
      trustScore = new TrustScore({
        walletAddress: wallet.toLowerCase()
      });
    }
    
    trustScore.isBlacklisted = true;
    trustScore.blacklistReason = reason || 'Manual blacklist';
    trustScore.trustScore = 0;
    trustScore.trustLevel = 'very_poor';
    
    await trustScore.save();
    
    res.json({
      success: true,
      data: {
        walletAddress: trustScore.walletAddress,
        isBlacklisted: true,
        blacklistReason: trustScore.blacklistReason
      }
    });
  } catch (error) {
    logger.error('Error blacklisting wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * DELETE /trust-score/:wallet/blacklist
 * Remove wallet from blacklist
 */
exports.removeFromBlacklist = async (req, res) => {
  try {
    const { wallet } = req.params;
    
    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address'
      });
    }
    
    const trustScore = await TrustScore.findByWallet(wallet);
    
    if (!trustScore) {
      return res.status(404).json({
        success: false,
        error: 'Trust score not found'
      });
    }
    
    trustScore.isBlacklisted = false;
    trustScore.blacklistReason = undefined;
    
    // Recalculate scores
    const scores = calculator.calculateAllScores(trustScore);
    trustScore.trustScore = scores.trustScore;
    trustScore.trustLevel = scores.trustLevel;
    trustScore.factorScores = scores.factorScores;
    
    await trustScore.save();
    
    res.json({
      success: true,
      data: {
        walletAddress: trustScore.walletAddress,
        isBlacklisted: false,
        trustScore: trustScore.trustScore,
        trustLevel: trustScore.trustLevel
      }
    });
  } catch (error) {
    logger.error('Error removing from blacklist:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

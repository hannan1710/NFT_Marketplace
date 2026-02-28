/**
 * Trust Score Calculator
 * Calculates individual factor scores and overall trust score
 */

const logger = require('../utils/logger');

class TrustScoreCalculator {
  constructor(weights = {}) {
    this.weights = {
      transactions: weights.transactions || 0.25,
      disputes: weights.disputes || 0.20,
      accountAge: weights.accountAge || 0.15,
      fraudHistory: weights.fraudHistory || 0.25,
      behavioral: weights.behavioral || 0.15
    };
    
    // Validate weights sum to 1.0
    const sum = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.01) {
      logger.warn(`Weights sum to ${sum}, normalizing...`);
      Object.keys(this.weights).forEach(key => {
        this.weights[key] /= sum;
      });
    }
  }
  
  /**
   * Calculate transaction score (0-100)
   * Based on successful transaction count and value
   */
  calculateTransactionScore(trustScore) {
    const { count, totalValue } = trustScore.successfulTransactions;
    
    // Score components
    let score = 0;
    
    // Transaction count (0-50 points)
    // Logarithmic scale: 1 tx = 10pts, 10 tx = 30pts, 100 tx = 50pts
    if (count > 0) {
      score += Math.min(50, 10 + (Math.log10(count) * 20));
    }
    
    // Transaction value (0-30 points)
    // Logarithmic scale based on total value
    if (totalValue > 0) {
      score += Math.min(30, Math.log10(totalValue + 1) * 5);
    }
    
    // Consistency bonus (0-20 points)
    // Based on regular transaction activity
    const recentTxs = trustScore.successfulTransactions.recentTransactions;
    if (recentTxs.length >= 5) {
      const timestamps = recentTxs.map(tx => tx.timestamp.getTime());
      const intervals = [];
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i-1] - timestamps[i]);
      }
      
      // Calculate coefficient of variation (lower is more consistent)
      const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
      const cv = Math.sqrt(variance) / mean;
      
      // Convert to score (lower CV = higher score)
      const consistencyScore = Math.max(0, 20 - (cv * 10));
      score += consistencyScore;
    }
    
    return Math.round(Math.min(100, Math.max(0, score)));
  }
  
  /**
   * Calculate dispute score (0-100)
   * Higher score = fewer disputes and better resolution rate
   */
  calculateDisputeScore(trustScore) {
    const { total, open, resolved, wonByWallet, lostByWallet } = trustScore.disputes;
    
    // Start with perfect score
    let score = 100;
    
    // Penalty for total disputes
    // Each dispute reduces score, with diminishing impact
    if (total > 0) {
      score -= Math.min(40, total * 5);
    }
    
    // Penalty for open disputes (more severe)
    if (open > 0) {
      score -= Math.min(30, open * 10);
    }
    
    // Bonus for good resolution rate
    if (resolved > 0) {
      const winRate = wonByWallet / resolved;
      score += winRate * 20; // Up to 20 bonus points
    }
    
    // Severe penalty for lost disputes
    if (lostByWallet > 0) {
      score -= lostByWallet * 15;
    }
    
    // Check recent dispute severity
    const recentDisputes = trustScore.disputes.recentDisputes.slice(0, 5);
    const criticalDisputes = recentDisputes.filter(d => d.severity === 'critical').length;
    if (criticalDisputes > 0) {
      score -= criticalDisputes * 10;
    }
    
    return Math.round(Math.min(100, Math.max(0, score)));
  }
  
  /**
   * Calculate account age score (0-100)
   * Older accounts with verification get higher scores
   */
  calculateAccountAgeScore(trustScore) {
    const { ageInDays, isVerified, firstTransactionDate } = trustScore.accountAge;
    
    let score = 0;
    
    // Age component (0-70 points)
    // Logarithmic scale: 1 day = 10pts, 30 days = 35pts, 365 days = 60pts, 1000+ days = 70pts
    if (ageInDays > 0) {
      score += Math.min(70, 10 + (Math.log10(ageInDays + 1) * 20));
    }
    
    // Verification bonus (0-30 points)
    if (isVerified) {
      score += 30;
    }
    
    // New account penalty
    if (ageInDays < 7) {
      score *= 0.5; // 50% penalty for accounts less than 1 week old
    } else if (ageInDays < 30) {
      score *= 0.75; // 25% penalty for accounts less than 1 month old
    }
    
    return Math.round(Math.min(100, Math.max(0, score)));
  }
  
  /**
   * Calculate fraud history score (0-100)
   * Lower score = more fraud incidents
   */
  calculateFraudHistoryScore(trustScore) {
    const { 
      totalIncidents, 
      verifiedIncidents, 
      highRiskIncidents,
      lastIncidentDate 
    } = trustScore.fraudHistory;
    
    // Start with perfect score
    let score = 100;
    
    // Severe penalty for verified fraud incidents
    if (verifiedIncidents > 0) {
      score -= Math.min(60, verifiedIncidents * 30);
    }
    
    // Penalty for unverified incidents (less severe)
    const unverifiedIncidents = totalIncidents - verifiedIncidents;
    if (unverifiedIncidents > 0) {
      score -= Math.min(20, unverifiedIncidents * 5);
    }
    
    // Extra penalty for high-risk incidents
    if (highRiskIncidents > 0) {
      score -= Math.min(30, highRiskIncidents * 15);
    }
    
    // Time decay: incidents become less impactful over time
    if (lastIncidentDate) {
      const daysSinceLastIncident = (Date.now() - lastIncidentDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Gradual recovery over 180 days
      if (daysSinceLastIncident > 180) {
        score += 10; // Bonus for clean record over 6 months
      } else if (daysSinceLastIncident > 90) {
        score += 5; // Small bonus for 3 months
      }
    }
    
    // Check recent incident pattern
    const recentIncidents = trustScore.fraudHistory.recentIncidents.slice(0, 5);
    if (recentIncidents.length >= 3) {
      // Multiple recent incidents = pattern of fraud
      score -= 20;
    }
    
    return Math.round(Math.min(100, Math.max(0, score)));
  }
  
  /**
   * Calculate behavioral consistency score (0-100)
   * Based on transaction patterns and behavior
   */
  calculateBehavioralScore(trustScore) {
    const metrics = trustScore.behavioralMetrics;
    
    let score = 50; // Start at neutral
    
    // Price consistency (0-25 points)
    if (metrics.priceConsistency !== undefined) {
      score += metrics.priceConsistency * 25;
    }
    
    // Time consistency (0-25 points)
    if (metrics.timeConsistency !== undefined) {
      score += metrics.timeConsistency * 25;
    }
    
    // Unique counterparties bonus (0-20 points)
    // More diverse trading partners = more trustworthy
    if (metrics.uniqueCounterparties > 0) {
      score += Math.min(20, Math.log10(metrics.uniqueCounterparties + 1) * 8);
    }
    
    // Holding period bonus (0-15 points)
    // Longer average holding = less flipping behavior
    if (metrics.avgHoldingPeriod > 0) {
      score += Math.min(15, Math.log10(metrics.avgHoldingPeriod + 1) * 5);
    }
    
    // Transaction frequency check (0-15 points)
    // Moderate frequency is good, too high or too low is suspicious
    if (metrics.transactionFrequency > 0) {
      if (metrics.transactionFrequency >= 0.5 && metrics.transactionFrequency <= 5) {
        score += 15; // Optimal range: 0.5-5 transactions per day
      } else if (metrics.transactionFrequency > 10) {
        score -= 10; // Penalty for excessive trading
      }
    }
    
    return Math.round(Math.min(100, Math.max(0, score)));
  }
  
  /**
   * Calculate all factor scores and overall trust score
   */
  calculateAllScores(trustScore) {
    // Calculate individual factor scores
    const factorScores = {
      transactionScore: this.calculateTransactionScore(trustScore),
      disputeScore: this.calculateDisputeScore(trustScore),
      accountAgeScore: this.calculateAccountAgeScore(trustScore),
      fraudHistoryScore: this.calculateFraudHistoryScore(trustScore),
      behavioralScore: this.calculateBehavioralScore(trustScore)
    };
    
    // Calculate weighted overall score
    const overallScore = Math.round(
      factorScores.transactionScore * this.weights.transactions +
      factorScores.disputeScore * this.weights.disputes +
      factorScores.accountAgeScore * this.weights.accountAge +
      factorScores.fraudHistoryScore * this.weights.fraudHistory +
      factorScores.behavioralScore * this.weights.behavioral
    );
    
    // Determine trust level
    const trustLevel = this.determineTrustLevel(overallScore);
    
    // Apply blacklist override
    if (trustScore.isBlacklisted) {
      return {
        trustScore: 0,
        trustLevel: 'very_poor',
        factorScores,
        isBlacklisted: true
      };
    }
    
    return {
      trustScore: overallScore,
      trustLevel,
      factorScores
    };
  }
  
  /**
   * Determine trust level from score
   */
  determineTrustLevel(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    if (score >= 20) return 'poor';
    return 'very_poor';
  }
  
  /**
   * Update behavioral metrics
   */
  updateBehavioralMetrics(trustScore) {
    const recentTxs = trustScore.successfulTransactions.recentTransactions;
    
    if (recentTxs.length < 2) {
      return trustScore.behavioralMetrics;
    }
    
    // Calculate average transaction value
    const avgValue = recentTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0) / recentTxs.length;
    
    // Calculate transaction frequency (per day)
    const oldestTx = recentTxs[recentTxs.length - 1].timestamp;
    const newestTx = recentTxs[0].timestamp;
    const daysDiff = (newestTx - oldestTx) / (1000 * 60 * 60 * 24);
    const frequency = daysDiff > 0 ? recentTxs.length / daysDiff : 0;
    
    // Calculate price consistency (coefficient of variation)
    const prices = recentTxs.map(tx => tx.amount || 0).filter(p => p > 0);
    let priceConsistency = 0.5;
    if (prices.length > 1) {
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variance = prices.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / prices.length;
      const cv = Math.sqrt(variance) / mean;
      priceConsistency = Math.max(0, Math.min(1, 1 - (cv / 2)));
    }
    
    // Calculate time consistency
    const timestamps = recentTxs.map(tx => tx.timestamp.getTime());
    let timeConsistency = 0.5;
    if (timestamps.length > 2) {
      const intervals = [];
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i-1] - timestamps[i]);
      }
      const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
      const cv = Math.sqrt(variance) / mean;
      timeConsistency = Math.max(0, Math.min(1, 1 - (cv / 3)));
    }
    
    return {
      avgTransactionValue: Math.round(avgValue * 100) / 100,
      transactionFrequency: Math.round(frequency * 100) / 100,
      uniqueCounterparties: trustScore.behavioralMetrics.uniqueCounterparties || 0,
      avgHoldingPeriod: trustScore.behavioralMetrics.avgHoldingPeriod || 0,
      priceConsistency: Math.round(priceConsistency * 100) / 100,
      timeConsistency: Math.round(timeConsistency * 100) / 100,
      lastUpdated: new Date()
    };
  }
}

module.exports = TrustScoreCalculator;

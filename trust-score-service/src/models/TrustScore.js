/**
 * Trust Score Model
 * Stores wallet trust scores with all contributing factors
 */

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionHash: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['mint', 'transfer', 'sale', 'purchase', 'listing', 'bid'],
    required: true 
  },
  amount: { type: Number, default: 0 },
  timestamp: { type: Date, required: true },
  successful: { type: Boolean, default: true }
}, { _id: false });

const disputeSchema = new mongoose.Schema({
  disputeId: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['fraud', 'counterfeit', 'non-delivery', 'quality', 'other'],
    required: true 
  },
  status: { 
    type: String, 
    enum: ['open', 'resolved', 'closed'],
    default: 'open'
  },
  resolution: { 
    type: String, 
    enum: ['buyer_favor', 'seller_favor', 'mutual', 'unresolved'],
    default: 'unresolved'
  },
  severity: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  timestamp: { type: Date, required: true },
  resolvedAt: { type: Date }
}, { _id: false });

const fraudIncidentSchema = new mongoose.Schema({
  incidentId: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['wash_trading', 'price_manipulation', 'sybil_attack', 'phishing', 'other'],
    required: true 
  },
  riskScore: { type: Number, required: true, min: 0, max: 100 },
  flags: [{ type: String }],
  timestamp: { type: Date, required: true },
  verified: { type: Boolean, default: false }
}, { _id: false });

const behavioralMetricSchema = new mongoose.Schema({
  avgTransactionValue: { type: Number, default: 0 },
  transactionFrequency: { type: Number, default: 0 }, // per day
  uniqueCounterparties: { type: Number, default: 0 },
  avgHoldingPeriod: { type: Number, default: 0 }, // in days
  priceConsistency: { type: Number, default: 0, min: 0, max: 1 },
  timeConsistency: { type: Number, default: 0, min: 0, max: 1 },
  lastUpdated: { type: Date, default: Date.now }
}, { _id: false });

const trustScoreSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  
  // Overall Trust Score (0-100)
  trustScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 50
  },
  
  // Trust Level
  trustLevel: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor', 'very_poor'],
    default: 'fair'
  },
  
  // Factor Scores (0-100 each)
  factorScores: {
    transactionScore: { type: Number, default: 50, min: 0, max: 100 },
    disputeScore: { type: Number, default: 50, min: 0, max: 100 },
    accountAgeScore: { type: Number, default: 50, min: 0, max: 100 },
    fraudHistoryScore: { type: Number, default: 50, min: 0, max: 100 },
    behavioralScore: { type: Number, default: 50, min: 0, max: 100 }
  },
  
  // Raw Data
  successfulTransactions: {
    count: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 },
    recentTransactions: [transactionSchema]
  },
  
  disputes: {
    total: { type: Number, default: 0 },
    open: { type: Number, default: 0 },
    resolved: { type: Number, default: 0 },
    wonByWallet: { type: Number, default: 0 },
    lostByWallet: { type: Number, default: 0 },
    recentDisputes: [disputeSchema]
  },
  
  accountAge: {
    firstTransactionDate: { type: Date },
    ageInDays: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false }
  },
  
  fraudHistory: {
    totalIncidents: { type: Number, default: 0 },
    verifiedIncidents: { type: Number, default: 0 },
    highRiskIncidents: { type: Number, default: 0 },
    lastIncidentDate: { type: Date },
    recentIncidents: [fraudIncidentSchema]
  },
  
  behavioralMetrics: behavioralMetricSchema,
  
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  updateCount: {
    type: Number,
    default: 0
  },
  
  isBlacklisted: {
    type: Boolean,
    default: false
  },
  
  blacklistReason: {
    type: String
  },
  
  notes: [{
    content: String,
    timestamp: { type: Date, default: Date.now },
    addedBy: String
  }]
}, {
  timestamps: true,
  collection: 'trust_scores'
});

// Indexes for performance
trustScoreSchema.index({ trustScore: -1 });
trustScoreSchema.index({ trustLevel: 1 });
trustScoreSchema.index({ 'accountAge.firstTransactionDate': 1 });
trustScoreSchema.index({ lastUpdated: -1 });
trustScoreSchema.index({ isBlacklisted: 1 });

// Virtual for score history (can be expanded)
trustScoreSchema.virtual('scoreHistory', {
  ref: 'TrustScoreHistory',
  localField: 'walletAddress',
  foreignField: 'walletAddress'
});

// Methods
trustScoreSchema.methods.calculateTrustScore = function(weights) {
  const {
    transactionScore,
    disputeScore,
    accountAgeScore,
    fraudHistoryScore,
    behavioralScore
  } = this.factorScores;
  
  const score = (
    transactionScore * weights.transactions +
    disputeScore * weights.disputes +
    accountAgeScore * weights.accountAge +
    fraudHistoryScore * weights.fraudHistory +
    behavioralScore * weights.behavioral
  );
  
  return Math.round(Math.min(100, Math.max(0, score)));
};

trustScoreSchema.methods.determineTrustLevel = function(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  if (score >= 20) return 'poor';
  return 'very_poor';
};

trustScoreSchema.methods.addTransaction = function(transaction) {
  this.successfulTransactions.count += 1;
  this.successfulTransactions.totalValue += transaction.amount || 0;
  
  // Keep only last 50 transactions
  this.successfulTransactions.recentTransactions.unshift(transaction);
  if (this.successfulTransactions.recentTransactions.length > 50) {
    this.successfulTransactions.recentTransactions.pop();
  }
  
  // Update account age if first transaction
  if (!this.accountAge.firstTransactionDate) {
    this.accountAge.firstTransactionDate = transaction.timestamp;
  }
  
  this.updateCount += 1;
  this.lastUpdated = new Date();
};

trustScoreSchema.methods.addDispute = function(dispute) {
  this.disputes.total += 1;
  this.disputes.open += 1;
  
  // Keep only last 20 disputes
  this.disputes.recentDisputes.unshift(dispute);
  if (this.disputes.recentDisputes.length > 20) {
    this.disputes.recentDisputes.pop();
  }
  
  this.updateCount += 1;
  this.lastUpdated = new Date();
};

trustScoreSchema.methods.addFraudIncident = function(incident) {
  this.fraudHistory.totalIncidents += 1;
  
  if (incident.verified) {
    this.fraudHistory.verifiedIncidents += 1;
  }
  
  if (incident.riskScore >= 70) {
    this.fraudHistory.highRiskIncidents += 1;
  }
  
  this.fraudHistory.lastIncidentDate = incident.timestamp;
  
  // Keep only last 20 incidents
  this.fraudHistory.recentIncidents.unshift(incident);
  if (this.fraudHistory.recentIncidents.length > 20) {
    this.fraudHistory.recentIncidents.pop();
  }
  
  this.updateCount += 1;
  this.lastUpdated = new Date();
};

// Static methods
trustScoreSchema.statics.findByWallet = function(walletAddress) {
  return this.findOne({ walletAddress: walletAddress.toLowerCase() });
};

trustScoreSchema.statics.getTopTrustedWallets = function(limit = 10) {
  return this.find({ isBlacklisted: false })
    .sort({ trustScore: -1 })
    .limit(limit)
    .select('walletAddress trustScore trustLevel lastUpdated');
};

trustScoreSchema.statics.getBlacklistedWallets = function() {
  return this.find({ isBlacklisted: true })
    .select('walletAddress trustScore blacklistReason lastUpdated');
};

module.exports = mongoose.model('TrustScore', trustScoreSchema);

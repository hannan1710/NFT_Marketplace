/**
 * NFT Event Model
 * Stores all blockchain events with processing status
 */

const mongoose = require('mongoose');

const nftEventSchema = new mongoose.Schema({
  // Event Identification
  eventType: {
    type: String,
    enum: ['NFTMinted', 'NFTSold', 'AuctionEnded', 'Transfer', 'ListingCreated', 'BidPlaced'],
    required: true,
    index: true
  },
  
  transactionHash: {
    type: String,
    required: true,
    index: true
  },
  
  blockNumber: {
    type: Number,
    required: true,
    index: true
  },
  
  blockTimestamp: {
    type: Date,
    required: true,
    index: true
  },
  
  logIndex: {
    type: Number,
    required: true
  },
  
  // Event Data
  contractAddress: {
    type: String,
    required: true,
    lowercase: true
  },
  
  tokenId: {
    type: String,
    required: true,
    index: true
  },
  
  from: {
    type: String,
    lowercase: true,
    index: true
  },
  
  to: {
    type: String,
    lowercase: true,
    index: true
  },
  
  price: {
    type: Number,
    default: 0
  },
  
  currency: {
    type: String,
    default: 'ETH'
  },
  
  // Additional Event Data
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Processing Status
  processingStatus: {
    stored: { type: Boolean, default: true },
    priceEvaluated: { type: Boolean, default: false },
    fraudAnalyzed: { type: Boolean, default: false },
    trustScoreUpdated: { type: Boolean, default: false }
  },
  
  // Processing Results
  priceEvaluation: {
    predictedPrice: { type: Number },
    confidence: { type: Number },
    evaluatedAt: { type: Date },
    error: { type: String }
  },
  
  fraudAnalysis: {
    riskScore: { type: Number },
    riskCategory: { type: String },
    flags: [{ type: String }],
    fraudDetected: { type: Boolean },
    analyzedAt: { type: Date },
    error: { type: String }
  },
  
  trustScoreUpdate: {
    buyerScore: { type: Number },
    sellerScore: { type: Number },
    updatedAt: { type: Date },
    error: { type: String }
  },
  
  // Processing Metadata
  processedAt: {
    type: Date,
    default: Date.now
  },
  
  retryCount: {
    type: Number,
    default: 0
  },
  
  lastRetryAt: {
    type: Date
  },
  
  errors: [{
    service: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Status
  isFullyProcessed: {
    type: Boolean,
    default: false,
    index: true
  },
  
  hasErrors: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  collection: 'nft_events'
});

// Compound indexes for efficient queries
nftEventSchema.index({ eventType: 1, blockNumber: -1 });
nftEventSchema.index({ transactionHash: 1, logIndex: 1 }, { unique: true });
nftEventSchema.index({ tokenId: 1, eventType: 1 });
nftEventSchema.index({ from: 1, blockTimestamp: -1 });
nftEventSchema.index({ to: 1, blockTimestamp: -1 });
nftEventSchema.index({ isFullyProcessed: 1, hasErrors: 1 });

// Methods
nftEventSchema.methods.markPriceEvaluated = function(result) {
  this.processingStatus.priceEvaluated = true;
  this.priceEvaluation = {
    predictedPrice: result.predictedPrice,
    confidence: result.confidence,
    evaluatedAt: new Date()
  };
  this.checkIfFullyProcessed();
};

nftEventSchema.methods.markFraudAnalyzed = function(result) {
  this.processingStatus.fraudAnalyzed = true;
  this.fraudAnalysis = {
    riskScore: result.riskScore,
    riskCategory: result.riskCategory,
    flags: result.flags || [],
    fraudDetected: result.fraudDetected,
    analyzedAt: new Date()
  };
  this.checkIfFullyProcessed();
};

nftEventSchema.methods.markTrustScoreUpdated = function(result) {
  this.processingStatus.trustScoreUpdated = true;
  this.trustScoreUpdate = {
    buyerScore: result.buyerScore,
    sellerScore: result.sellerScore,
    updatedAt: new Date()
  };
  this.checkIfFullyProcessed();
};

nftEventSchema.methods.addError = function(service, message) {
  this.errors.push({ service, message });
  this.hasErrors = true;
  this.retryCount += 1;
  this.lastRetryAt = new Date();
};

nftEventSchema.methods.checkIfFullyProcessed = function() {
  const { priceEvaluated, fraudAnalyzed, trustScoreUpdated } = this.processingStatus;
  
  // Check if all enabled services have processed
  const enablePrice = process.env.ENABLE_PRICE_PREDICTION !== 'false';
  const enableFraud = process.env.ENABLE_FRAUD_DETECTION !== 'false';
  const enableTrust = process.env.ENABLE_TRUST_SCORE !== 'false';
  
  this.isFullyProcessed = (
    (!enablePrice || priceEvaluated) &&
    (!enableFraud || fraudAnalyzed) &&
    (!enableTrust || trustScoreUpdated)
  );
};

// Static methods
nftEventSchema.statics.findByTransaction = function(txHash) {
  return this.find({ transactionHash: txHash }).sort({ logIndex: 1 });
};

nftEventSchema.statics.findByToken = function(tokenId) {
  return this.find({ tokenId }).sort({ blockTimestamp: -1 });
};

nftEventSchema.statics.findByWallet = function(walletAddress) {
  return this.find({
    $or: [
      { from: walletAddress.toLowerCase() },
      { to: walletAddress.toLowerCase() }
    ]
  }).sort({ blockTimestamp: -1 });
};

nftEventSchema.statics.getUnprocessedEvents = function(limit = 100) {
  return this.find({
    isFullyProcessed: false,
    retryCount: { $lt: parseInt(process.env.RETRY_ATTEMPTS) || 3 }
  })
  .sort({ blockNumber: 1 })
  .limit(limit);
};

nftEventSchema.statics.getEventStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        processed: {
          $sum: { $cond: ['$isFullyProcessed', 1, 0] }
        },
        withErrors: {
          $sum: { $cond: ['$hasErrors', 1, 0] }
        }
      }
    }
  ]);
  
  return stats;
};

module.exports = mongoose.model('NFTEvent', nftEventSchema);

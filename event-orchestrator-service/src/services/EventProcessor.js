/**
 * Event Processor
 * Processes events by triggering AI price evaluation, fraud analysis, and trust score updates
 */

const axios = require('axios');
const logger = require('../utils/logger');
const Queue = require('bull');

class EventProcessor {
  constructor() {
    this.pricePredictorUrl = process.env.PRICE_PREDICTOR_URL || 'http://localhost:8001';
    this.fraudDetectorUrl = process.env.FRAUD_DETECTOR_URL || 'http://localhost:8000';
    this.trustScoreUrl = process.env.TRUST_SCORE_URL || 'http://localhost:4000';
    
    this.enablePricePrediction = process.env.ENABLE_PRICE_PREDICTION !== 'false';
    this.enableFraudDetection = process.env.ENABLE_FRAUD_DETECTION !== 'false';
    this.enableTrustScore = process.env.ENABLE_TRUST_SCORE !== 'false';
    
    // Create Bull queues for async processing
    this.priceQueue = new Queue('price-evaluation', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined
      }
    });
    
    this.fraudQueue = new Queue('fraud-analysis', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined
      }
    });
    
    this.trustQueue = new Queue('trust-score-update', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined
      }
    });
    
    this.setupQueueProcessors();
  }
  
  setupQueueProcessors() {
    // Price evaluation processor
    this.priceQueue.process(async (job) => {
      const { event } = job.data;
      return await this.evaluatePrice(event);
    });
    
    // Fraud analysis processor
    this.fraudQueue.process(async (job) => {
      const { event } = job.data;
      return await this.analyzeFraud(event);
    });
    
    // Trust score update processor
    this.trustQueue.process(async (job) => {
      const { event } = job.data;
      return await this.updateTrustScore(event);
    });
    
    // Error handlers
    this.priceQueue.on('failed', (job, err) => {
      logger.error(`Price evaluation failed for job ${job.id}:`, err);
    });
    
    this.fraudQueue.on('failed', (job, err) => {
      logger.error(`Fraud analysis failed for job ${job.id}:`, err);
    });
    
    this.trustQueue.on('failed', (job, err) => {
      logger.error(`Trust score update failed for job ${job.id}:`, err);
    });
  }

  
  async processEvent(nftEvent) {
    logger.info(`Processing event: ${nftEvent.eventType} - ${nftEvent.transactionHash}`);
    
    try {
      // Add jobs to queues for parallel processing
      const jobs = [];
      
      if (this.enablePricePrediction && this.shouldEvaluatePrice(nftEvent)) {
        jobs.push(
          this.priceQueue.add({ event: nftEvent.toObject() }, {
            attempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
            backoff: {
              type: 'exponential',
              delay: parseInt(process.env.RETRY_DELAY) || 5000
            }
          })
        );
      }
      
      if (this.enableFraudDetection && this.shouldAnalyzeFraud(nftEvent)) {
        jobs.push(
          this.fraudQueue.add({ event: nftEvent.toObject() }, {
            attempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
            backoff: {
              type: 'exponential',
              delay: parseInt(process.env.RETRY_DELAY) || 5000
            }
          })
        );
      }
      
      if (this.enableTrustScore && this.shouldUpdateTrustScore(nftEvent)) {
        jobs.push(
          this.trustQueue.add({ event: nftEvent.toObject() }, {
            attempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
            backoff: {
              type: 'exponential',
              delay: parseInt(process.env.RETRY_DELAY) || 5000
            }
          })
        );
      }
      
      await Promise.all(jobs);
      logger.info(`Event queued for processing: ${nftEvent.transactionHash}`);
    } catch (error) {
      logger.error(`Error processing event ${nftEvent.transactionHash}:`, error);
      nftEvent.addError('EventProcessor', error.message);
      await nftEvent.save();
    }
  }
  
  shouldEvaluatePrice(event) {
    // Evaluate price for sold and auction ended events
    return ['NFTSold', 'AuctionEnded'].includes(event.eventType) && event.price > 0;
  }
  
  shouldAnalyzeFraud(event) {
    // Analyze fraud for all transaction events
    return ['NFTSold', 'AuctionEnded'].includes(event.eventType);
  }
  
  shouldUpdateTrustScore(event) {
    // Update trust score for all events involving wallets
    return event.from && event.to;
  }
  
  async evaluatePrice(eventData) {
    try {
      logger.info(`Evaluating price for token ${eventData.tokenId}`);
      
      // Prepare data for price predictor
      const predictionRequest = {
        rarity_score: this.estimateRarity(eventData),
        creator_volume: 0, // Would need to fetch from database
        demand_index: this.calculateDemandIndex(eventData),
        price_trend: eventData.price || 0
      };
      
      const response = await axios.post(
        `${this.pricePredictorUrl}/predict`,
        predictionRequest,
        { timeout: 10000 }
      );
      
      const result = {
        predictedPrice: response.data.predicted_price,
        confidence: response.data.confidence
      };
      
      // Update event in database
      const NFTEvent = require('../models/NFTEvent');
      const event = await NFTEvent.findOne({
        transactionHash: eventData.transactionHash,
        logIndex: eventData.logIndex
      });
      
      if (event) {
        event.markPriceEvaluated(result);
        await event.save();
        logger.info(`Price evaluated for ${eventData.tokenId}: $${result.predictedPrice}`);
      }
      
      return result;
    } catch (error) {
      logger.error(`Error evaluating price for ${eventData.tokenId}:`, error.message);
      
      // Update event with error
      const NFTEvent = require('../models/NFTEvent');
      const event = await NFTEvent.findOne({
        transactionHash: eventData.transactionHash,
        logIndex: eventData.logIndex
      });
      
      if (event) {
        event.priceEvaluation = { error: error.message };
        event.addError('PricePredictor', error.message);
        await event.save();
      }
      
      throw error;
    }
  }

  
  async analyzeFraud(eventData) {
    try {
      logger.info(`Analyzing fraud for transaction ${eventData.transactionHash}`);
      
      // Prepare transaction data for fraud detector
      const transaction = {
        transaction_id: eventData.transactionHash,
        nft_id: eventData.tokenId,
        seller: eventData.from,
        buyer: eventData.to,
        price: eventData.price,
        timestamp: Math.floor(new Date(eventData.blockTimestamp).getTime() / 1000)
      };
      
      const response = await axios.post(
        `${this.fraudDetectorUrl}/risk-score`,
        { transaction },
        { timeout: 15000 }
      );
      
      const result = {
        riskScore: response.data.risk_score,
        riskCategory: response.data.risk_category,
        flags: response.data.flags || [],
        fraudDetected: response.data.fraud_detected
      };
      
      // Update event in database
      const NFTEvent = require('../models/NFTEvent');
      const event = await NFTEvent.findOne({
        transactionHash: eventData.transactionHash,
        logIndex: eventData.logIndex
      });
      
      if (event) {
        event.markFraudAnalyzed(result);
        await event.save();
        logger.info(`Fraud analyzed for ${eventData.transactionHash}: Risk ${result.riskScore}`);
      }
      
      return result;
    } catch (error) {
      logger.error(`Error analyzing fraud for ${eventData.transactionHash}:`, error.message);
      
      // Update event with error
      const NFTEvent = require('../models/NFTEvent');
      const event = await NFTEvent.findOne({
        transactionHash: eventData.transactionHash,
        logIndex: eventData.logIndex
      });
      
      if (event) {
        event.fraudAnalysis = { error: error.message };
        event.addError('FraudDetector', error.message);
        await event.save();
      }
      
      throw error;
    }
  }
  
  async updateTrustScore(eventData) {
    try {
      logger.info(`Updating trust scores for ${eventData.from} and ${eventData.to}`);
      
      const results = {};
      
      // Update buyer/receiver trust score
      if (eventData.to) {
        try {
          const buyerResponse = await axios.post(
            `${this.trustScoreUrl}/api/trust-score/${eventData.to}/transaction`,
            {
              transactionHash: eventData.transactionHash,
              type: eventData.eventType === 'NFTMinted' ? 'mint' : 'purchase',
              amount: eventData.price,
              timestamp: eventData.blockTimestamp
            },
            { timeout: 10000 }
          );
          
          results.buyerScore = buyerResponse.data.data.trustScore;
        } catch (error) {
          logger.error(`Error updating buyer trust score:`, error.message);
        }
      }
      
      // Update seller trust score
      if (eventData.from && eventData.from !== '0x0000000000000000000000000000000000000000') {
        try {
          const sellerResponse = await axios.post(
            `${this.trustScoreUrl}/api/trust-score/${eventData.from}/transaction`,
            {
              transactionHash: eventData.transactionHash,
              type: 'sale',
              amount: eventData.price,
              timestamp: eventData.blockTimestamp
            },
            { timeout: 10000 }
          );
          
          results.sellerScore = sellerResponse.data.data.trustScore;
        } catch (error) {
          logger.error(`Error updating seller trust score:`, error.message);
        }
      }
      
      // Update event in database
      const NFTEvent = require('../models/NFTEvent');
      const event = await NFTEvent.findOne({
        transactionHash: eventData.transactionHash,
        logIndex: eventData.logIndex
      });
      
      if (event) {
        event.markTrustScoreUpdated(results);
        await event.save();
        logger.info(`Trust scores updated for ${eventData.transactionHash}`);
      }
      
      return results;
    } catch (error) {
      logger.error(`Error updating trust scores for ${eventData.transactionHash}:`, error.message);
      
      // Update event with error
      const NFTEvent = require('../models/NFTEvent');
      const event = await NFTEvent.findOne({
        transactionHash: eventData.transactionHash,
        logIndex: eventData.logIndex
      });
      
      if (event) {
        event.trustScoreUpdate = { error: error.message };
        event.addError('TrustScore', error.message);
        await event.save();
      }
      
      throw error;
    }
  }
  
  // Helper methods
  estimateRarity(eventData) {
    // Simple rarity estimation based on token ID
    // In production, this would fetch actual rarity data
    const tokenId = parseInt(eventData.tokenId);
    return Math.min(100, 50 + (tokenId % 50));
  }
  
  calculateDemandIndex(eventData) {
    // Simple demand calculation
    // In production, this would analyze market data
    return eventData.price > 0 ? Math.min(100, eventData.price / 10) : 50;
  }
  
  async getQueueStats() {
    const [priceStats, fraudStats, trustStats] = await Promise.all([
      this.priceQueue.getJobCounts(),
      this.fraudQueue.getJobCounts(),
      this.trustQueue.getJobCounts()
    ]);
    
    return {
      priceEvaluation: priceStats,
      fraudAnalysis: fraudStats,
      trustScoreUpdate: trustStats
    };
  }
}

module.exports = EventProcessor;

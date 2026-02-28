/**
 * Blockchain Event Listener
 * Listens to blockchain events and updates trust scores automatically
 */

const { ethers } = require('ethers');
const logger = require('../utils/logger');
const TrustScore = require('../models/TrustScore');
const TrustScoreCalculator = require('./TrustScoreCalculator');

class BlockchainListener {
  constructor(config) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.nftContract = new ethers.Contract(
      config.nftContractAddress,
      config.nftAbi,
      this.provider
    );
    this.marketplaceContract = new ethers.Contract(
      config.marketplaceContractAddress,
      config.marketplaceAbi,
      this.provider
    );
    this.calculator = new TrustScoreCalculator(config.weights);
    this.isListening = false;
  }
  
  /**
   * Start listening to blockchain events
   */
  async start() {
    if (this.isListening) {
      logger.warn('Blockchain listener already running');
      return;
    }
    
    logger.info('Starting blockchain event listener...');
    
    try {
      // Listen to NFT Transfer events
      this.nftContract.on('Transfer', async (from, to, tokenId, event) => {
        await this.handleTransferEvent(from, to, tokenId, event);
      });
      
      // Listen to Marketplace events
      this.marketplaceContract.on('ListingCreated', async (listingId, seller, nftContract, tokenId, price, event) => {
        await this.handleListingCreated(seller, price, event);
      });
      
      this.marketplaceContract.on('ListingPurchased', async (listingId, buyer, seller, price, event) => {
        await this.handleListingPurchased(buyer, seller, price, event);
      });
      
      this.marketplaceContract.on('AuctionCreated', async (auctionId, seller, nftContract, tokenId, startPrice, event) => {
        await this.handleAuctionCreated(seller, startPrice, event);
      });
      
      this.marketplaceContract.on('BidPlaced', async (auctionId, bidder, amount, event) => {
        await this.handleBidPlaced(bidder, amount, event);
      });
      
      this.marketplaceContract.on('AuctionFinalized', async (auctionId, winner, seller, finalPrice, event) => {
        await this.handleAuctionFinalized(winner, seller, finalPrice, event);
      });
      
      this.isListening = true;
      logger.info('Blockchain listener started successfully');
    } catch (error) {
      logger.error('Error starting blockchain listener:', error);
      throw error;
    }
  }
  
  /**
   * Stop listening to blockchain events
   */
  stop() {
    if (!this.isListening) {
      return;
    }
    
    logger.info('Stopping blockchain event listener...');
    
    this.nftContract.removeAllListeners();
    this.marketplaceContract.removeAllListeners();
    
    this.isListening = false;
    logger.info('Blockchain listener stopped');
  }
  
  /**
   * Handle NFT Transfer event
   */
  async handleTransferEvent(from, to, tokenId, event) {
    try {
      const tx = await event.getTransaction();
      const block = await event.getBlock();
      
      logger.info(`Transfer event: ${from} -> ${to}, Token: ${tokenId}`);
      
      // Update sender's trust score
      if (from !== ethers.ZeroAddress) {
        await this.updateWalletTrustScore(from, {
          transactionHash: tx.hash,
          type: 'transfer',
          amount: 0,
          timestamp: new Date(block.timestamp * 1000),
          successful: true
        });
      }
      
      // Update receiver's trust score
      if (to !== ethers.ZeroAddress) {
        await this.updateWalletTrustScore(to, {
          transactionHash: tx.hash,
          type: 'transfer',
          amount: 0,
          timestamp: new Date(block.timestamp * 1000),
          successful: true
        });
      }
    } catch (error) {
      logger.error('Error handling Transfer event:', error);
    }
  }
  
  /**
   * Handle Listing Created event
   */
  async handleListingCreated(seller, price, event) {
    try {
      const tx = await event.getTransaction();
      const block = await event.getBlock();
      
      logger.info(`Listing created by ${seller}, Price: ${ethers.formatEther(price)} ETH`);
      
      await this.updateWalletTrustScore(seller, {
        transactionHash: tx.hash,
        type: 'listing',
        amount: parseFloat(ethers.formatEther(price)),
        timestamp: new Date(block.timestamp * 1000),
        successful: true
      });
    } catch (error) {
      logger.error('Error handling ListingCreated event:', error);
    }
  }
  
  /**
   * Handle Listing Purchased event
   */
  async handleListingPurchased(buyer, seller, price, event) {
    try {
      const tx = await event.getTransaction();
      const block = await event.getBlock();
      
      logger.info(`Purchase: ${buyer} bought from ${seller}, Price: ${ethers.formatEther(price)} ETH`);
      
      const amount = parseFloat(ethers.formatEther(price));
      const timestamp = new Date(block.timestamp * 1000);
      
      // Update buyer's trust score
      await this.updateWalletTrustScore(buyer, {
        transactionHash: tx.hash,
        type: 'purchase',
        amount,
        timestamp,
        successful: true
      });
      
      // Update seller's trust score
      await this.updateWalletTrustScore(seller, {
        transactionHash: tx.hash,
        type: 'sale',
        amount,
        timestamp,
        successful: true
      });
    } catch (error) {
      logger.error('Error handling ListingPurchased event:', error);
    }
  }
  
  /**
   * Handle Auction Created event
   */
  async handleAuctionCreated(seller, startPrice, event) {
    try {
      const tx = await event.getTransaction();
      const block = await event.getBlock();
      
      logger.info(`Auction created by ${seller}, Start Price: ${ethers.formatEther(startPrice)} ETH`);
      
      await this.updateWalletTrustScore(seller, {
        transactionHash: tx.hash,
        type: 'listing',
        amount: parseFloat(ethers.formatEther(startPrice)),
        timestamp: new Date(block.timestamp * 1000),
        successful: true
      });
    } catch (error) {
      logger.error('Error handling AuctionCreated event:', error);
    }
  }
  
  /**
   * Handle Bid Placed event
   */
  async handleBidPlaced(bidder, amount, event) {
    try {
      const tx = await event.getTransaction();
      const block = await event.getBlock();
      
      logger.info(`Bid placed by ${bidder}, Amount: ${ethers.formatEther(amount)} ETH`);
      
      await this.updateWalletTrustScore(bidder, {
        transactionHash: tx.hash,
        type: 'bid',
        amount: parseFloat(ethers.formatEther(amount)),
        timestamp: new Date(block.timestamp * 1000),
        successful: true
      });
    } catch (error) {
      logger.error('Error handling BidPlaced event:', error);
    }
  }
  
  /**
   * Handle Auction Finalized event
   */
  async handleAuctionFinalized(winner, seller, finalPrice, event) {
    try {
      const tx = await event.getTransaction();
      const block = await event.getBlock();
      
      logger.info(`Auction finalized: ${winner} won, Seller: ${seller}, Price: ${ethers.formatEther(finalPrice)} ETH`);
      
      const amount = parseFloat(ethers.formatEther(finalPrice));
      const timestamp = new Date(block.timestamp * 1000);
      
      // Update winner's trust score
      await this.updateWalletTrustScore(winner, {
        transactionHash: tx.hash,
        type: 'purchase',
        amount,
        timestamp,
        successful: true
      });
      
      // Update seller's trust score
      await this.updateWalletTrustScore(seller, {
        transactionHash: tx.hash,
        type: 'sale',
        amount,
        timestamp,
        successful: true
      });
    } catch (error) {
      logger.error('Error handling AuctionFinalized event:', error);
    }
  }
  
  /**
   * Update wallet trust score
   */
  async updateWalletTrustScore(walletAddress, transaction) {
    try {
      // Find or create trust score
      let trustScore = await TrustScore.findByWallet(walletAddress);
      
      if (!trustScore) {
        trustScore = new TrustScore({
          walletAddress: walletAddress.toLowerCase()
        });
      }
      
      // Add transaction
      trustScore.addTransaction(transaction);
      
      // Update account age
      if (!trustScore.accountAge.firstTransactionDate) {
        trustScore.accountAge.firstTransactionDate = transaction.timestamp;
      }
      const ageInDays = Math.floor(
        (Date.now() - trustScore.accountAge.firstTransactionDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      trustScore.accountAge.ageInDays = ageInDays;
      
      // Update behavioral metrics
      trustScore.behavioralMetrics = this.calculator.updateBehavioralMetrics(trustScore);
      
      // Recalculate scores
      const scores = this.calculator.calculateAllScores(trustScore);
      trustScore.trustScore = scores.trustScore;
      trustScore.trustLevel = scores.trustLevel;
      trustScore.factorScores = scores.factorScores;
      
      // Save
      await trustScore.save();
      
      logger.info(`Updated trust score for ${walletAddress}: ${scores.trustScore}`);
    } catch (error) {
      logger.error(`Error updating trust score for ${walletAddress}:`, error);
    }
  }
  
  /**
   * Sync historical events
   */
  async syncHistoricalEvents(fromBlock = 0, toBlock = 'latest') {
    logger.info(`Syncing historical events from block ${fromBlock} to ${toBlock}...`);
    
    try {
      // Get Transfer events
      const transferFilter = this.nftContract.filters.Transfer();
      const transferEvents = await this.nftContract.queryFilter(transferFilter, fromBlock, toBlock);
      
      logger.info(`Found ${transferEvents.length} Transfer events`);
      
      for (const event of transferEvents) {
        await this.handleTransferEvent(event.args.from, event.args.to, event.args.tokenId, event);
      }
      
      // Get Marketplace events
      const purchaseFilter = this.marketplaceContract.filters.ListingPurchased();
      const purchaseEvents = await this.marketplaceContract.queryFilter(purchaseFilter, fromBlock, toBlock);
      
      logger.info(`Found ${purchaseEvents.length} Purchase events`);
      
      for (const event of purchaseEvents) {
        await this.handleListingPurchased(
          event.args.buyer,
          event.args.seller,
          event.args.price,
          event
        );
      }
      
      logger.info('Historical sync completed');
    } catch (error) {
      logger.error('Error syncing historical events:', error);
      throw error;
    }
  }
}

module.exports = BlockchainListener;

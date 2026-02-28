/**
 * Blockchain Event Listener
 * Listens to NFT and Marketplace events
 */

const { ethers } = require('ethers');
const logger = require('../utils/logger');
const NFTEvent = require('../models/NFTEvent');
const EventProcessor = require('./EventProcessor');

class BlockchainListener {
  constructor(config) {
    this.config = config;
    this.provider = new ethers.WebSocketProvider(config.wsUrl);
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
    this.eventProcessor = new EventProcessor();
    this.isListening = false;
  }
  
  async start() {
    if (this.isListening) {
      logger.warn('Blockchain listener already running');
      return;
    }
    
    logger.info('Starting blockchain event listener...');
    
    try {
      // Listen to NFT Minted events (Transfer from zero address)
      this.nftContract.on('Transfer', async (from, to, tokenId, event) => {
        if (from === ethers.ZeroAddress) {
          await this.handleNFTMinted(to, tokenId, event);
        }
      });
      
      // Listen to NFT Sold events (ListingPurchased)
      this.marketplaceContract.on('ListingPurchased', 
        async (listingId, buyer, seller, nftContract, tokenId, price, event) => {
          await this.handleNFTSold(buyer, seller, tokenId, price, event);
        }
      );
      
      // Listen to AuctionEnded events
      this.marketplaceContract.on('AuctionFinalized',
        async (auctionId, winner, seller, nftContract, tokenId, finalPrice, event) => {
          await this.handleAuctionEnded(winner, seller, tokenId, finalPrice, event);
        }
      );
      
      this.isListening = true;
      logger.info('Blockchain listener started successfully');
    } catch (error) {
      logger.error('Error starting blockchain listener:', error);
      throw error;
    }
  }

  
  stop() {
    if (!this.isListening) return;
    
    logger.info('Stopping blockchain event listener...');
    this.nftContract.removeAllListeners();
    this.marketplaceContract.removeAllListeners();
    this.provider.destroy();
    this.isListening = false;
    logger.info('Blockchain listener stopped');
  }
  
  async handleNFTMinted(to, tokenId, event) {
    try {
      const tx = await event.getTransaction();
      const block = await event.getBlock();
      
      logger.info(`NFT Minted: Token ${tokenId} to ${to}`);
      
      const eventData = {
        eventType: 'NFTMinted',
        transactionHash: tx.hash,
        blockNumber: block.number,
        blockTimestamp: new Date(block.timestamp * 1000),
        logIndex: event.index,
        contractAddress: await this.nftContract.getAddress(),
        tokenId: tokenId.toString(),
        from: ethers.ZeroAddress,
        to: to.toLowerCase(),
        price: 0,
        metadata: {
          gasUsed: tx.gasLimit.toString(),
          gasPrice: tx.gasPrice ? tx.gasPrice.toString() : '0'
        }
      };
      
      await this.storeAndProcessEvent(eventData);
    } catch (error) {
      logger.error('Error handling NFTMinted event:', error);
    }
  }
  
  async handleNFTSold(buyer, seller, tokenId, price, event) {
    try {
      const tx = await event.getTransaction();
      const block = await event.getBlock();
      
      const priceInEth = parseFloat(ethers.formatEther(price));
      logger.info(`NFT Sold: Token ${tokenId}, ${seller} -> ${buyer}, Price: ${priceInEth} ETH`);
      
      const eventData = {
        eventType: 'NFTSold',
        transactionHash: tx.hash,
        blockNumber: block.number,
        blockTimestamp: new Date(block.timestamp * 1000),
        logIndex: event.index,
        contractAddress: await this.marketplaceContract.getAddress(),
        tokenId: tokenId.toString(),
        from: seller.toLowerCase(),
        to: buyer.toLowerCase(),
        price: priceInEth,
        currency: 'ETH',
        metadata: {
          gasUsed: tx.gasLimit.toString(),
          gasPrice: tx.gasPrice ? tx.gasPrice.toString() : '0'
        }
      };
      
      await this.storeAndProcessEvent(eventData);
    } catch (error) {
      logger.error('Error handling NFTSold event:', error);
    }
  }

  
  async handleAuctionEnded(winner, seller, tokenId, finalPrice, event) {
    try {
      const tx = await event.getTransaction();
      const block = await event.getBlock();
      
      const priceInEth = parseFloat(ethers.formatEther(finalPrice));
      logger.info(`Auction Ended: Token ${tokenId}, Winner: ${winner}, Price: ${priceInEth} ETH`);
      
      const eventData = {
        eventType: 'AuctionEnded',
        transactionHash: tx.hash,
        blockNumber: block.number,
        blockTimestamp: new Date(block.timestamp * 1000),
        logIndex: event.index,
        contractAddress: await this.marketplaceContract.getAddress(),
        tokenId: tokenId.toString(),
        from: seller.toLowerCase(),
        to: winner.toLowerCase(),
        price: priceInEth,
        currency: 'ETH',
        metadata: {
          gasUsed: tx.gasLimit.toString(),
          gasPrice: tx.gasPrice ? tx.gasPrice.toString() : '0'
        }
      };
      
      await this.storeAndProcessEvent(eventData);
    } catch (error) {
      logger.error('Error handling AuctionEnded event:', error);
    }
  }
  
  async storeAndProcessEvent(eventData) {
    try {
      // Check if event already exists
      const existing = await NFTEvent.findOne({
        transactionHash: eventData.transactionHash,
        logIndex: eventData.logIndex
      });
      
      if (existing) {
        logger.warn(`Event already processed: ${eventData.transactionHash}:${eventData.logIndex}`);
        return;
      }
      
      // Create and save event
      const nftEvent = new NFTEvent(eventData);
      await nftEvent.save();
      
      logger.info(`Event stored: ${eventData.eventType} - ${eventData.transactionHash}`);
      
      // Process event asynchronously
      await this.eventProcessor.processEvent(nftEvent);
    } catch (error) {
      logger.error('Error storing and processing event:', error);
    }
  }
  
  async syncHistoricalEvents(fromBlock, toBlock = 'latest') {
    logger.info(`Syncing historical events from block ${fromBlock} to ${toBlock}...`);
    
    try {
      // Sync NFT Minted events
      const mintFilter = this.nftContract.filters.Transfer(ethers.ZeroAddress, null, null);
      const mintEvents = await this.nftContract.queryFilter(mintFilter, fromBlock, toBlock);
      
      logger.info(`Found ${mintEvents.length} mint events`);
      
      for (const event of mintEvents) {
        await this.handleNFTMinted(event.args.to, event.args.tokenId, event);
      }
      
      // Sync NFT Sold events
      const soldFilter = this.marketplaceContract.filters.ListingPurchased();
      const soldEvents = await this.marketplaceContract.queryFilter(soldFilter, fromBlock, toBlock);
      
      logger.info(`Found ${soldEvents.length} sold events`);
      
      for (const event of soldEvents) {
        await this.handleNFTSold(
          event.args.buyer,
          event.args.seller,
          event.args.tokenId,
          event.args.price,
          event
        );
      }
      
      // Sync Auction Ended events
      const auctionFilter = this.marketplaceContract.filters.AuctionFinalized();
      const auctionEvents = await this.marketplaceContract.queryFilter(auctionFilter, fromBlock, toBlock);
      
      logger.info(`Found ${auctionEvents.length} auction events`);
      
      for (const event of auctionEvents) {
        await this.handleAuctionEnded(
          event.args.winner,
          event.args.seller,
          event.args.tokenId,
          event.args.finalPrice,
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

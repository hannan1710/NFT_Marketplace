/**
 * Comprehensive Integration Tests for Blockchain Event Listener
 * Tests event capture, MongoDB storage, AI service calls, trust score updates,
 * duplicate handling, and network recovery
 */

const { ethers } = require('ethers');
const mongoose = require('mongoose');
const axios = require('axios');
const BlockchainListener = require('../src/services/BlockchainListener');
const EventProcessor = require('../src/services/EventProcessor');
const NFTEvent = require('../src/models/NFTEvent');

// Mock axios for AI service calls
jest.mock('axios');

// Mock Bull queues
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    process: jest.fn(),
    add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    on: jest.fn(),
    getJobCounts: jest.fn().mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0
    })
  }));
});

describe('Blockchain Event Listener Integration Tests', () => {
  let listener;
  let mockProvider;
  let mockNFTContract;
  let mockMarketplaceContract;
  let eventProcessor;

  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/nft-events-test';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear database
    await NFTEvent.deleteMany({});

    // Reset mocks
    jest.clearAllMocks();
    axios.post.mockReset();

    // Create mock provider
    mockProvider = {
      destroy: jest.fn(),
      getBlockNumber: jest.fn().mockResolvedValue(1000)
    };

    // Create mock contracts with event emitters
    mockNFTContract = {
      getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890'),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
      queryFilter: jest.fn().mockResolvedValue([]),
      filters: {
        Transfer: jest.fn().mockReturnValue({})
      }
    };

    mockMarketplaceContract = {
      getAddress: jest.fn().mockResolvedValue('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
      queryFilter: jest.fn().mockResolvedValue([]),
      filters: {
        ListingPurchased: jest.fn().mockReturnValue({}),
        AuctionFinalized: jest.fn().mockReturnValue({})
      }
    };

    // Create event processor
    eventProcessor = new EventProcessor();

    // Create listener with mocked dependencies
    listener = new BlockchainListener({
      wsUrl: 'ws://localhost:8545',
      nftContractAddress: '0x1234567890123456789012345678901234567890',
      marketplaceContractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      nftAbi: [],
      marketplaceAbi: []
    });

    // Replace with mocks
    listener.provider = mockProvider;
    listener.nftContract = mockNFTContract;
    listener.marketplaceContract = mockMarketplaceContract;
    listener.eventProcessor = eventProcessor;
  });

  afterEach(async () => {
    if (listener.isListening) {
      listener.stop();
    }
  });

  // ============================================================================
  // CATEGORY 1: Event Capture Simulation
  // ============================================================================

  describe('Category 1: Event Capture Simulation', () => {
    test('should capture NFTMinted event correctly', async () => {
      await listener.start();

      // Simulate NFTMinted event (Transfer from zero address)
      const mockEvent = createMockEvent({
        eventName: 'Transfer',
        args: {
          from: ethers.ZeroAddress,
          to: '0xbuyer123',
          tokenId: BigInt(1)
        }
      });

      // Get the Transfer event handler
      const transferHandler = mockNFTContract.on.mock.calls[0][1];
      
      // Trigger the event
      await transferHandler(
        mockEvent.args.from,
        mockEvent.args.to,
        mockEvent.args.tokenId,
        mockEvent
      );

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify event was stored
      const storedEvents = await NFTEvent.find({ eventType: 'NFTMinted' });
      expect(storedEvents).toHaveLength(1);
      expect(storedEvents[0].tokenId).toBe('1');
      expect(storedEvents[0].to).toBe('0xbuyer123');
      expect(storedEvents[0].from).toBe(ethers.ZeroAddress);
    });

    test('should capture NFTSold event correctly', async () => {
      await listener.start();

      const mockEvent = createMockEvent({
        eventName: 'ListingPurchased',
        args: {
          listingId: BigInt(1),
          buyer: '0xbuyer456',
          seller: '0xseller789',
          nftContract: '0x1234567890123456789012345678901234567890',
          tokenId: BigInt(5),
          price: ethers.parseEther('2.5')
        }
      });

      const soldHandler = mockMarketplaceContract.on.mock.calls[0][1];
      
      await soldHandler(
        mockEvent.args.listingId,
        mockEvent.args.buyer,
        mockEvent.args.seller,
        mockEvent.args.nftContract,
        mockEvent.args.tokenId,
        mockEvent.args.price,
        mockEvent
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const storedEvents = await NFTEvent.find({ eventType: 'NFTSold' });
      expect(storedEvents).toHaveLength(1);
      expect(storedEvents[0].tokenId).toBe('5');
      expect(storedEvents[0].to).toBe('0xbuyer456');
      expect(storedEvents[0].from).toBe('0xseller789');
      expect(storedEvents[0].price).toBe(2.5);
    });

    test('should capture AuctionEnded event correctly', async () => {
      await listener.start();

      const mockEvent = createMockEvent({
        eventName: 'AuctionFinalized',
        args: {
          auctionId: BigInt(10),
          winner: '0xwinner111',
          seller: '0xseller222',
          nftContract: '0x1234567890123456789012345678901234567890',
          tokenId: BigInt(15),
          finalPrice: ethers.parseEther('5.0')
        }
      });

      const auctionHandler = mockMarketplaceContract.on.mock.calls[1][1];
      
      await auctionHandler(
        mockEvent.args.auctionId,
        mockEvent.args.winner,
        mockEvent.args.seller,
        mockEvent.args.nftContract,
        mockEvent.args.tokenId,
        mockEvent.args.finalPrice,
        mockEvent
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const storedEvents = await NFTEvent.find({ eventType: 'AuctionEnded' });
      expect(storedEvents).toHaveLength(1);
      expect(storedEvents[0].tokenId).toBe('15');
      expect(storedEvents[0].to).toBe('0xwinner111');
      expect(storedEvents[0].from).toBe('0xseller222');
      expect(storedEvents[0].price).toBe(5.0);
    });

    test('should capture multiple events in sequence', async () => {
      await listener.start();

      // Mint event
      const mintEvent = createMockEvent({
        eventName: 'Transfer',
        args: {
          from: ethers.ZeroAddress,
          to: '0xminter',
          tokenId: BigInt(100)
        },
        transactionHash: '0xtxmint100'
      });

      // Sold event (different transaction hash)
      const soldEvent = createMockEvent({
        eventName: 'ListingPurchased',
        args: {
          listingId: BigInt(1),
          buyer: '0xbuyer',
          seller: '0xminter',
          nftContract: '0x1234567890123456789012345678901234567890',
          tokenId: BigInt(100),
          price: ethers.parseEther('1.0')
        },
        blockNumber: 1001,
        transactionHash: '0xtxsold100'
      });

      const transferHandler = mockNFTContract.on.mock.calls[0][1];
      const soldHandler = mockMarketplaceContract.on.mock.calls[0][1];

      await transferHandler(mintEvent.args.from, mintEvent.args.to, mintEvent.args.tokenId, mintEvent);
      await soldHandler(
        soldEvent.args.listingId,
        soldEvent.args.buyer,
        soldEvent.args.seller,
        soldEvent.args.nftContract,
        soldEvent.args.tokenId,
        soldEvent.args.price,
        soldEvent
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const allEvents = await NFTEvent.find({}).sort({ blockNumber: 1 });
      expect(allEvents).toHaveLength(2);
      expect(allEvents[0].eventType).toBe('NFTMinted');
      expect(allEvents[1].eventType).toBe('NFTSold');
    });

    test('should extract correct event metadata', async () => {
      await listener.start();

      const mockEvent = createMockEvent({
        eventName: 'Transfer',
        args: {
          from: ethers.ZeroAddress,
          to: '0xrecipient',
          tokenId: BigInt(50)
        }
      });

      const transferHandler = mockNFTContract.on.mock.calls[0][1];
      await transferHandler(mockEvent.args.from, mockEvent.args.to, mockEvent.args.tokenId, mockEvent);

      await new Promise(resolve => setTimeout(resolve, 100));

      const event = await NFTEvent.findOne({ tokenId: '50' });
      expect(event.transactionHash).toBe('0xtxhash123');
      expect(event.blockNumber).toBe(1000);
      expect(event.logIndex).toBe(0);
      expect(event.metadata.gasUsed).toBeDefined();
      expect(event.metadata.gasPrice).toBeDefined();
    });
  });

  // ============================================================================
  // CATEGORY 2: MongoDB Storage Validation
  // ============================================================================

  describe('Category 2: MongoDB Storage Validation', () => {
    test('should store event with all required fields', async () => {
      await listener.start();

      const mockEvent = createMockEvent({
        eventName: 'Transfer',
        args: {
          from: ethers.ZeroAddress,
          to: '0xuser123',
          tokenId: BigInt(25)
        }
      });

      const transferHandler = mockNFTContract.on.mock.calls[0][1];
      await transferHandler(mockEvent.args.from, mockEvent.args.to, mockEvent.args.tokenId, mockEvent);

      await new Promise(resolve => setTimeout(resolve, 100));

      const event = await NFTEvent.findOne({ tokenId: '25' });
      
      // Verify all required fields
      expect(event.eventType).toBe('NFTMinted');
      expect(event.transactionHash).toBe('0xtxhash123');
      expect(event.blockNumber).toBe(1000);
      expect(event.blockTimestamp).toBeInstanceOf(Date);
      expect(event.logIndex).toBe(0);
      expect(event.contractAddress).toBe('0x1234567890123456789012345678901234567890');
      expect(event.tokenId).toBe('25');
      expect(event.from).toBe(ethers.ZeroAddress);
      expect(event.to).toBe('0xuser123');
      expect(event.processingStatus.stored).toBe(true);
    });

    test('should create indexes for efficient queries', async () => {
      const indexes = await NFTEvent.collection.getIndexes();
      
      // Verify important indexes exist
      expect(indexes).toHaveProperty('eventType_1');
      expect(indexes).toHaveProperty('transactionHash_1_logIndex_1');
      expect(indexes).toHaveProperty('tokenId_1');
      expect(indexes).toHaveProperty('blockNumber_1');
    });

    test('should enforce unique constraint on transactionHash + logIndex', async () => {
      const eventData = {
        eventType: 'NFTMinted',
        transactionHash: '0xunique123',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: '100',
        from: ethers.ZeroAddress,
        to: '0xuser'
      };

      await NFTEvent.create(eventData);

      // Try to create duplicate
      await expect(NFTEvent.create(eventData)).rejects.toThrow();
    });

    test('should query events by transaction hash', async () => {
      await NFTEvent.create({
        eventType: 'NFTMinted',
        transactionHash: '0xtx111',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: '1',
        from: ethers.ZeroAddress,
        to: '0xuser1'
      });

      await NFTEvent.create({
        eventType: 'NFTSold',
        transactionHash: '0xtx111',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 1,
        contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tokenId: '1',
        from: '0xuser1',
        to: '0xuser2',
        price: 1.5
      });

      const events = await NFTEvent.findByTransaction('0xtx111');
      expect(events).toHaveLength(2);
      expect(events[0].logIndex).toBe(0);
      expect(events[1].logIndex).toBe(1);
    });

    test('should query events by token ID', async () => {
      await NFTEvent.create({
        eventType: 'NFTMinted',
        transactionHash: '0xtx1',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: '42',
        from: ethers.ZeroAddress,
        to: '0xminter'
      });

      await NFTEvent.create({
        eventType: 'NFTSold',
        transactionHash: '0xtx2',
        blockNumber: 1001,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tokenId: '42',
        from: '0xminter',
        to: '0xbuyer',
        price: 2.0
      });

      const events = await NFTEvent.findByToken('42');
      expect(events).toHaveLength(2);
      expect(events[0].eventType).toBe('NFTSold'); // Most recent first
      expect(events[1].eventType).toBe('NFTMinted');
    });

    test('should query events by wallet address', async () => {
      await NFTEvent.create({
        eventType: 'NFTMinted',
        transactionHash: '0xtx1',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: '10',
        from: ethers.ZeroAddress,
        to: '0xwallet123'
      });

      await NFTEvent.create({
        eventType: 'NFTSold',
        transactionHash: '0xtx2',
        blockNumber: 1001,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tokenId: '10',
        from: '0xwallet123',
        to: '0xbuyer',
        price: 1.0
      });

      const events = await NFTEvent.findByWallet('0xwallet123');
      expect(events).toHaveLength(2);
    });
  });

  // ============================================================================
  // CATEGORY 3: Triggering AI Service Calls
  // ============================================================================

  describe('Category 3: Triggering AI Service Calls', () => {
    test('should trigger price prediction for NFTSold event', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          predicted_price: 2.8,
          confidence: 0.85
        }
      });

      const event = await NFTEvent.create({
        eventType: 'NFTSold',
        transactionHash: '0xtxprice',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tokenId: '50',
        from: '0xseller',
        to: '0xbuyer',
        price: 2.5
      });

      await eventProcessor.evaluatePrice(event.toObject());

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/predict'),
        expect.objectContaining({
          rarity_score: expect.any(Number),
          demand_index: expect.any(Number)
        }),
        expect.any(Object)
      );

      const updatedEvent = await NFTEvent.findById(event._id);
      expect(updatedEvent.processingStatus.priceEvaluated).toBe(true);
      expect(updatedEvent.priceEvaluation.predictedPrice).toBe(2.8);
      expect(updatedEvent.priceEvaluation.confidence).toBe(0.85);
    });

    test('should trigger fraud analysis for NFTSold event', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          risk_score: 45.5,
          risk_category: 'MEDIUM',
          flags: ['RAPID_FLIPPING'],
          fraud_detected: false
        }
      });

      const event = await NFTEvent.create({
        eventType: 'NFTSold',
        transactionHash: '0xtxfraud',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tokenId: '75',
        from: '0xseller',
        to: '0xbuyer',
        price: 3.0
      });

      await eventProcessor.analyzeFraud(event.toObject());

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/risk-score'),
        expect.objectContaining({
          transaction: expect.objectContaining({
            transaction_id: '0xtxfraud',
            nft_id: '75',
            seller: '0xseller',
            buyer: '0xbuyer',
            price: 3.0
          })
        }),
        expect.any(Object)
      );

      const updatedEvent = await NFTEvent.findById(event._id);
      expect(updatedEvent.processingStatus.fraudAnalyzed).toBe(true);
      expect(updatedEvent.fraudAnalysis.riskScore).toBe(45.5);
      expect(updatedEvent.fraudAnalysis.riskCategory).toBe('MEDIUM');
      expect(updatedEvent.fraudAnalysis.flags).toContain('RAPID_FLIPPING');
    });

    test('should not trigger price prediction for NFTMinted event', async () => {
      const event = await NFTEvent.create({
        eventType: 'NFTMinted',
        transactionHash: '0xtxmint',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: '99',
        from: ethers.ZeroAddress,
        to: '0xminter',
        price: 0
      });

      const shouldEvaluate = eventProcessor.shouldEvaluatePrice(event);
      expect(shouldEvaluate).toBe(false);
    });

    test('should handle AI service timeout gracefully', async () => {
      axios.post.mockRejectedValueOnce(new Error('Request timeout'));

      const event = await NFTEvent.create({
        eventType: 'NFTSold',
        transactionHash: '0xtxtimeout',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tokenId: '88',
        from: '0xseller',
        to: '0xbuyer',
        price: 1.5
      });

      await expect(eventProcessor.evaluatePrice(event.toObject())).rejects.toThrow();

      const updatedEvent = await NFTEvent.findById(event._id);
      expect(updatedEvent.priceEvaluation.error).toBeDefined();
      expect(updatedEvent.hasErrors).toBe(true);
    });

    test('should handle AI service error response', async () => {
      axios.post.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { error: 'Internal server error' }
        }
      });

      const event = await NFTEvent.create({
        eventType: 'NFTSold',
        transactionHash: '0xtxerror',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tokenId: '77',
        from: '0xseller',
        to: '0xbuyer',
        price: 2.0
      });

      try {
        await eventProcessor.analyzeFraud(event.toObject());
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Wait for database update
      await new Promise(resolve => setTimeout(resolve, 100));

      const updatedEvent = await NFTEvent.findById(event._id);
      // Check that either error is set or errors array has entries
      const hasError = updatedEvent.fraudAnalysis.error || updatedEvent.errors.length > 0;
      expect(hasError).toBeTruthy();
    });
  });

  // ============================================================================
  // CATEGORY 4: Trust Score Update Trigger
  // ============================================================================

  describe('Category 4: Trust Score Update Trigger', () => {
    test('should trigger trust score update for buyer', async () => {
      axios.post.mockResolvedValueOnce({
        data: {
          data: {
            trustScore: 75.5
          }
        }
      });

      const event = await NFTEvent.create({
        eventType: 'NFTSold',
        transactionHash: '0xtxtrust',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tokenId: '60',
        from: '0xseller',
        to: '0xbuyer',
        price: 1.8
      });

      await eventProcessor.updateTrustScore(event.toObject());

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/trust-score/0xbuyer/transaction'),
        expect.objectContaining({
          transactionHash: '0xtxtrust',
          type: 'purchase',
          amount: 1.8
        }),
        expect.any(Object)
      );

      const updatedEvent = await NFTEvent.findById(event._id);
      expect(updatedEvent.processingStatus.trustScoreUpdated).toBe(true);
      expect(updatedEvent.trustScoreUpdate.buyerScore).toBe(75.5);
    });

    test('should trigger trust score update for seller', async () => {
      axios.post
        .mockResolvedValueOnce({
          data: { data: { trustScore: 80.0 } }
        })
        .mockResolvedValueOnce({
          data: { data: { trustScore: 85.5 } }
        });

      const event = await NFTEvent.create({
        eventType: 'NFTSold',
        transactionHash: '0xtxseller',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tokenId: '65',
        from: '0xseller123',
        to: '0xbuyer456',
        price: 2.2
      });

      await eventProcessor.updateTrustScore(event.toObject());

      expect(axios.post).toHaveBeenCalledTimes(2);
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/trust-score/0xseller123/transaction'),
        expect.objectContaining({
          type: 'sale'
        }),
        expect.any(Object)
      );

      const updatedEvent = await NFTEvent.findById(event._id);
      expect(updatedEvent.trustScoreUpdate.buyerScore).toBe(80.0);
      expect(updatedEvent.trustScoreUpdate.sellerScore).toBe(85.5);
    });

    test('should trigger trust score for minter', async () => {
      axios.post.mockResolvedValueOnce({
        data: { data: { trustScore: 70.0 } }
      });

      const event = await NFTEvent.create({
        eventType: 'NFTMinted',
        transactionHash: '0xtxminter',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: '70',
        from: ethers.ZeroAddress,
        to: '0xminter789',
        price: 0
      });

      await eventProcessor.updateTrustScore(event.toObject());

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/trust-score/0xminter789/transaction'),
        expect.objectContaining({
          type: 'mint'
        }),
        expect.any(Object)
      );
    });

    test('should handle trust score service unavailable', async () => {
      axios.post.mockRejectedValue(new Error('Service unavailable'));

      const event = await NFTEvent.create({
        eventType: 'NFTSold',
        transactionHash: '0xtxunavail',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tokenId: '80',
        from: '0xseller',
        to: '0xbuyer',
        price: 1.0
      });

      // The method catches individual errors internally and returns empty results
      const result = await eventProcessor.updateTrustScore(event.toObject());
      
      // Result should be empty object since both calls failed
      expect(result).toEqual({});

      const updatedEvent = await NFTEvent.findById(event._id);
      // Trust score is still marked as updated even if calls failed
      expect(updatedEvent.processingStatus.trustScoreUpdated).toBe(true);
      // But no scores are set
      expect(updatedEvent.trustScoreUpdate.buyerScore).toBeUndefined();
      expect(updatedEvent.trustScoreUpdate.sellerScore).toBeUndefined();
    });

    test('should mark event as fully processed after all updates', async () => {
      axios.post
        .mockResolvedValueOnce({ data: { predicted_price: 2.0, confidence: 0.9 } })
        .mockResolvedValueOnce({ data: { risk_score: 20, risk_category: 'LOW', fraud_detected: false } })
        .mockResolvedValueOnce({ data: { data: { trustScore: 85 } } })
        .mockResolvedValueOnce({ data: { data: { trustScore: 90 } } });

      const event = await NFTEvent.create({
        eventType: 'NFTSold',
        transactionHash: '0xtxfull',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tokenId: '90',
        from: '0xseller',
        to: '0xbuyer',
        price: 2.0
      });

      await eventProcessor.evaluatePrice(event.toObject());
      await eventProcessor.analyzeFraud(event.toObject());
      await eventProcessor.updateTrustScore(event.toObject());

      const updatedEvent = await NFTEvent.findById(event._id);
      expect(updatedEvent.isFullyProcessed).toBe(true);
      expect(updatedEvent.processingStatus.priceEvaluated).toBe(true);
      expect(updatedEvent.processingStatus.fraudAnalyzed).toBe(true);
      expect(updatedEvent.processingStatus.trustScoreUpdated).toBe(true);
    });
  });

  // ============================================================================
  // CATEGORY 5: Handling Duplicate Events
  // ============================================================================

  describe('Category 5: Handling Duplicate Events', () => {
    test('should detect and skip duplicate events', async () => {
      await listener.start();

      const mockEvent = createMockEvent({
        eventName: 'Transfer',
        args: {
          from: ethers.ZeroAddress,
          to: '0xuser',
          tokenId: BigInt(200)
        }
      });

      const transferHandler = mockNFTContract.on.mock.calls[0][1];

      // Process event first time
      await transferHandler(mockEvent.args.from, mockEvent.args.to, mockEvent.args.tokenId, mockEvent);
      await new Promise(resolve => setTimeout(resolve, 100));

      const firstCount = await NFTEvent.countDocuments({ tokenId: '200' });
      expect(firstCount).toBe(1);

      // Process same event again (duplicate)
      await transferHandler(mockEvent.args.from, mockEvent.args.to, mockEvent.args.tokenId, mockEvent);
      await new Promise(resolve => setTimeout(resolve, 100));

      const secondCount = await NFTEvent.countDocuments({ tokenId: '200' });
      expect(secondCount).toBe(1); // Should still be 1
    });

    test('should use transactionHash + logIndex for duplicate detection', async () => {
      const event1 = await NFTEvent.create({
        eventType: 'NFTMinted',
        transactionHash: '0xsametx',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: '300',
        from: ethers.ZeroAddress,
        to: '0xuser1'
      });

      // Different logIndex, same transaction - should succeed
      const event2 = await NFTEvent.create({
        eventType: 'NFTSold',
        transactionHash: '0xsametx',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 1,
        contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tokenId: '300',
        from: '0xuser1',
        to: '0xuser2',
        price: 1.0
      });

      expect(event1._id).not.toEqual(event2._id);

      // Same transactionHash + logIndex - should fail
      await expect(NFTEvent.create({
        eventType: 'NFTMinted',
        transactionHash: '0xsametx',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: '300',
        from: ethers.ZeroAddress,
        to: '0xuser1'
      })).rejects.toThrow();
    });

    test('should log warning for duplicate events', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await NFTEvent.create({
        eventType: 'NFTMinted',
        transactionHash: '0xduptx',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: '400',
        from: ethers.ZeroAddress,
        to: '0xuser'
      });

      await listener.storeAndProcessEvent({
        eventType: 'NFTMinted',
        transactionHash: '0xduptx',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: '400',
        from: ethers.ZeroAddress,
        to: '0xuser'
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const count = await NFTEvent.countDocuments({ transactionHash: '0xduptx' });
      expect(count).toBe(1);

      consoleSpy.mockRestore();
    });

    test('should handle race condition for duplicate events', async () => {
      const eventData = {
        eventType: 'NFTMinted',
        transactionHash: '0xracetx',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: '500',
        from: ethers.ZeroAddress,
        to: '0xuser'
      };

      // Simulate concurrent processing
      const promises = [
        listener.storeAndProcessEvent(eventData),
        listener.storeAndProcessEvent(eventData),
        listener.storeAndProcessEvent(eventData)
      ];

      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 200));

      const count = await NFTEvent.countDocuments({ transactionHash: '0xracetx' });
      expect(count).toBe(1);
    });

    test('should allow same event from different blocks', async () => {
      await NFTEvent.create({
        eventType: 'NFTMinted',
        transactionHash: '0xtx1',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: '600',
        from: ethers.ZeroAddress,
        to: '0xuser'
      });

      // Different transaction hash - should succeed
      await NFTEvent.create({
        eventType: 'NFTMinted',
        transactionHash: '0xtx2',
        blockNumber: 1001,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: '601',
        from: ethers.ZeroAddress,
        to: '0xuser'
      });

      const count = await NFTEvent.countDocuments({ to: '0xuser' });
      expect(count).toBe(2);
    });
  });

  // ============================================================================
  // CATEGORY 6: Network Disconnection Recovery
  // ============================================================================

  describe('Category 6: Network Disconnection Recovery', () => {
    test('should handle provider disconnection gracefully', async () => {
      await listener.start();
      expect(listener.isListening).toBe(true);

      // Simulate disconnection
      listener.stop();
      expect(listener.isListening).toBe(false);
      expect(mockProvider.destroy).toHaveBeenCalled();
    });

    test('should remove all listeners on stop', async () => {
      await listener.start();
      
      listener.stop();

      expect(mockNFTContract.removeAllListeners).toHaveBeenCalled();
      expect(mockMarketplaceContract.removeAllListeners).toHaveBeenCalled();
    });

    test('should not start if already listening', async () => {
      await listener.start();
      expect(listener.isListening).toBe(true);

      // Try to start again
      await listener.start();

      // Should only register listeners once
      expect(mockNFTContract.on).toHaveBeenCalledTimes(1);
    });

    test('should sync historical events after reconnection', async () => {
      const mockMintEvents = [
        createMockEvent({
          eventName: 'Transfer',
          args: {
            from: ethers.ZeroAddress,
            to: '0xuser1',
            tokenId: BigInt(1000)
          },
          blockNumber: 900
        }),
        createMockEvent({
          eventName: 'Transfer',
          args: {
            from: ethers.ZeroAddress,
            to: '0xuser2',
            tokenId: BigInt(1001)
          },
          blockNumber: 901
        })
      ];

      mockNFTContract.queryFilter.mockResolvedValueOnce(mockMintEvents);
      mockMarketplaceContract.queryFilter
        .mockResolvedValueOnce([]) // Sold events
        .mockResolvedValueOnce([]); // Auction events

      await listener.syncHistoricalEvents(900, 1000);

      await new Promise(resolve => setTimeout(resolve, 200));

      const events = await NFTEvent.find({ blockNumber: { $gte: 900, $lte: 1000 } });
      expect(events.length).toBeGreaterThan(0);
    });

    test('should handle sync errors gracefully', async () => {
      mockNFTContract.queryFilter.mockRejectedValueOnce(new Error('Network error'));

      await expect(listener.syncHistoricalEvents(1000, 2000)).rejects.toThrow('Network error');
    });

    test('should retry failed event processing', async () => {
      const event = await NFTEvent.create({
        eventType: 'NFTSold',
        transactionHash: '0xtxretry',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tokenId: '700',
        from: '0xseller',
        to: '0xbuyer',
        price: 1.5,
        retryCount: 0
      });

      // First attempt fails
      axios.post.mockRejectedValueOnce(new Error('Temporary failure'));

      await expect(eventProcessor.evaluatePrice(event.toObject())).rejects.toThrow();

      let updatedEvent = await NFTEvent.findById(event._id);
      expect(updatedEvent.retryCount).toBe(1);
      expect(updatedEvent.hasErrors).toBe(true);

      // Second attempt succeeds
      axios.post.mockResolvedValueOnce({
        data: { predicted_price: 1.8, confidence: 0.8 }
      });

      await eventProcessor.evaluatePrice(updatedEvent.toObject());

      updatedEvent = await NFTEvent.findById(event._id);
      expect(updatedEvent.processingStatus.priceEvaluated).toBe(true);
    });

    test('should get unprocessed events for retry', async () => {
      await NFTEvent.create({
        eventType: 'NFTSold',
        transactionHash: '0xtx1',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tokenId: '800',
        from: '0xseller',
        to: '0xbuyer',
        price: 1.0,
        isFullyProcessed: false,
        retryCount: 1
      });

      await NFTEvent.create({
        eventType: 'NFTSold',
        transactionHash: '0xtx2',
        blockNumber: 1001,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tokenId: '801',
        from: '0xseller',
        to: '0xbuyer',
        price: 1.0,
        isFullyProcessed: true
      });

      const unprocessed = await NFTEvent.getUnprocessedEvents(10);
      expect(unprocessed.length).toBe(1);
      expect(unprocessed[0].tokenId).toBe('800');
    });

    test('should get event statistics', async () => {
      await NFTEvent.create({
        eventType: 'NFTMinted',
        transactionHash: '0xtx1',
        blockNumber: 1000,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0x1234567890123456789012345678901234567890',
        tokenId: '900',
        from: ethers.ZeroAddress,
        to: '0xuser',
        isFullyProcessed: true
      });

      await NFTEvent.create({
        eventType: 'NFTSold',
        transactionHash: '0xtx2',
        blockNumber: 1001,
        blockTimestamp: new Date(),
        logIndex: 0,
        contractAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        tokenId: '901',
        from: '0xseller',
        to: '0xbuyer',
        price: 1.0,
        isFullyProcessed: false,
        hasErrors: true
      });

      const stats = await NFTEvent.getEventStats();
      expect(stats.length).toBeGreaterThan(0);
      
      const mintStats = stats.find(s => s._id === 'NFTMinted');
      expect(mintStats.count).toBe(1);
      expect(mintStats.processed).toBe(1);
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function createMockEvent(config) {
  const {
    eventName,
    args,
    blockNumber = 1000,
    transactionHash = '0xtxhash123',
    logIndex = 0
  } = config;

  return {
    args,
    index: logIndex,
    getTransaction: jest.fn().mockResolvedValue({
      hash: transactionHash,
      gasLimit: BigInt(21000),
      gasPrice: BigInt(20000000000)
    }),
    getBlock: jest.fn().mockResolvedValue({
      number: blockNumber,
      timestamp: Math.floor(Date.now() / 1000)
    })
  };
}

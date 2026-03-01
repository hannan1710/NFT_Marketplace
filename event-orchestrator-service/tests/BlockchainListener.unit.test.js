/**
 * Unit Tests for Blockchain Event Listener (No MongoDB Required)
 * Tests core functionality with mocked dependencies
 */

const { ethers } = require('ethers');
const BlockchainListener = require('../src/services/BlockchainListener');

// Mock all external dependencies
jest.mock('axios');
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

// Mock MongoDB model
jest.mock('../src/models/NFTEvent', () => {
  const mockEvents = [];
  
  return {
    create: jest.fn((data) => {
      const event = { ...data, _id: 'mock-id-' + Date.now(), save: jest.fn() };
      mockEvents.push(event);
      return Promise.resolve(event);
    }),
    findOne: jest.fn((query) => {
      const event = mockEvents.find(e => 
        e.transactionHash === query.transactionHash && 
        e.logIndex === query.logIndex
      );
      return Promise.resolve(event || null);
    }),
    find: jest.fn(() => Promise.resolve(mockEvents)),
    countDocuments: jest.fn(() => Promise.resolve(mockEvents.length)),
    deleteMany: jest.fn(() => {
      mockEvents.length = 0;
      return Promise.resolve();
    })
  };
});

describe('Blockchain Event Listener Unit Tests', () => {
  let listener;
  let mockProvider;
  let mockNFTContract;
  let mockMarketplaceContract;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock provider
    mockProvider = {
      destroy: jest.fn(),
      getBlockNumber: jest.fn().mockResolvedValue(1000)
    };

    // Create mock contracts
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

    // Create listener
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
  });

  afterEach(() => {
    if (listener.isListening) {
      listener.stop();
    }
  });

  describe('Listener Lifecycle', () => {
    test('should start listener and register event handlers', async () => {
      await listener.start();

      expect(listener.isListening).toBe(true);
      expect(mockNFTContract.on).toHaveBeenCalledWith('Transfer', expect.any(Function));
      expect(mockMarketplaceContract.on).toHaveBeenCalledWith('ListingPurchased', expect.any(Function));
      expect(mockMarketplaceContract.on).toHaveBeenCalledWith('AuctionFinalized', expect.any(Function));
    });

    test('should not start if already listening', async () => {
      await listener.start();
      const firstCallCount = mockNFTContract.on.mock.calls.length;

      await listener.start();
      const secondCallCount = mockNFTContract.on.mock.calls.length;

      expect(firstCallCount).toBe(secondCallCount);
    });

    test('should stop listener and cleanup', () => {
      listener.isListening = true;
      listener.stop();

      expect(listener.isListening).toBe(false);
      expect(mockNFTContract.removeAllListeners).toHaveBeenCalled();
      expect(mockMarketplaceContract.removeAllListeners).toHaveBeenCalled();
      expect(mockProvider.destroy).toHaveBeenCalled();
    });

    test('should handle stop when not listening', () => {
      listener.isListening = false;
      expect(() => listener.stop()).not.toThrow();
    });
  });

  describe('Event Handling', () => {
    test('should handle NFTMinted event', async () => {
      const mockEvent = createMockEvent({
        args: {
          from: ethers.ZeroAddress,
          to: '0xbuyer123',
          tokenId: BigInt(1)
        }
      });

      await listener.handleNFTMinted('0xbuyer123', BigInt(1), mockEvent);

      // Verify event was processed
      expect(mockEvent.getTransaction).toHaveBeenCalled();
      expect(mockEvent.getBlock).toHaveBeenCalled();
    });

    test('should handle NFTSold event', async () => {
      const mockEvent = createMockEvent({
        args: {
          buyer: '0xbuyer456',
          seller: '0xseller789',
          tokenId: BigInt(5),
          price: ethers.parseEther('2.5')
        }
      });

      await listener.handleNFTSold(
        '0xbuyer456',
        '0xseller789',
        BigInt(5),
        ethers.parseEther('2.5'),
        mockEvent
      );

      expect(mockEvent.getTransaction).toHaveBeenCalled();
      expect(mockEvent.getBlock).toHaveBeenCalled();
    });

    test('should handle AuctionEnded event', async () => {
      const mockEvent = createMockEvent({
        args: {
          winner: '0xwinner111',
          seller: '0xseller222',
          tokenId: BigInt(15),
          finalPrice: ethers.parseEther('5.0')
        }
      });

      await listener.handleAuctionEnded(
        '0xwinner111',
        '0xseller222',
        BigInt(15),
        ethers.parseEther('5.0'),
        mockEvent
      );

      expect(mockEvent.getTransaction).toHaveBeenCalled();
      expect(mockEvent.getBlock).toHaveBeenCalled();
    });

    test('should handle event processing errors gracefully', async () => {
      const mockEvent = createMockEvent({
        args: {
          from: ethers.ZeroAddress,
          to: '0xbuyer',
          tokenId: BigInt(1)
        }
      });

      // Make getTransaction throw an error
      mockEvent.getTransaction.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await expect(listener.handleNFTMinted('0xbuyer', BigInt(1), mockEvent)).resolves.not.toThrow();
    });
  });

  describe('Historical Sync', () => {
    test('should sync historical events', async () => {
      const mockMintEvents = [
        createMockEvent({
          args: {
            from: ethers.ZeroAddress,
            to: '0xuser1',
            tokenId: BigInt(1000)
          }
        })
      ];

      mockNFTContract.queryFilter.mockResolvedValueOnce(mockMintEvents);
      mockMarketplaceContract.queryFilter
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await listener.syncHistoricalEvents(900, 1000);

      expect(mockNFTContract.queryFilter).toHaveBeenCalled();
      expect(mockMarketplaceContract.queryFilter).toHaveBeenCalledTimes(2);
    });

    test('should handle sync errors', async () => {
      mockNFTContract.queryFilter.mockRejectedValueOnce(new Error('Network error'));

      await expect(listener.syncHistoricalEvents(1000, 2000)).rejects.toThrow('Network error');
    });
  });
});

// Helper function
function createMockEvent(config) {
  const {
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

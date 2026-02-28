/**
 * Event Orchestrator Service - Main Application
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');
const eventRoutes = require('./routes/eventRoutes');
const BlockchainListener = require('./services/BlockchainListener');
const EventProcessor = require('./services/EventProcessor');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({
    service: 'Event Orchestrator Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      getByTransaction: 'GET /api/events/transaction/:txHash',
      getByToken: 'GET /api/events/token/:tokenId',
      getByWallet: 'GET /api/events/wallet/:address',
      getStats: 'GET /api/events/stats',
      getUnprocessed: 'GET /api/events/unprocessed',
      getQueueStats: 'GET /api/queue/stats',
      health: 'GET /health'
    }
  });
});

app.get('/health', async (req, res) => {
  const eventProcessor = app.get('eventProcessor');
  const queueStats = eventProcessor ? await eventProcessor.getQueueStats() : null;
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected',
    blockchainListener: app.get('blockchainListener')?.isListening || false,
    queueStats
  });
});

app.get('/api/queue/stats', async (req, res) => {
  try {
    const eventProcessor = app.get('eventProcessor');
    const stats = await eventProcessor.getQueueStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use('/api/events', eventRoutes);

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Initialize blockchain listener
let blockchainListener;
let eventProcessor;

const startBlockchainListener = () => {
  if (!process.env.ETHEREUM_WS_URL || !process.env.NFT_CONTRACT_ADDRESS) {
    logger.warn('Blockchain listener not configured');
    return;
  }
  
  try {
    const nftAbi = require('./abis/NFTContract.json');
    const marketplaceAbi = require('./abis/NFTMarketplace.json');
    
    blockchainListener = new BlockchainListener({
      wsUrl: process.env.ETHEREUM_WS_URL,
      nftContractAddress: process.env.NFT_CONTRACT_ADDRESS,
      marketplaceContractAddress: process.env.MARKETPLACE_CONTRACT_ADDRESS,
      nftAbi,
      marketplaceAbi
    });
    
    blockchainListener.start();
    app.set('blockchainListener', blockchainListener);
    logger.info('Blockchain listener started');
    
    // Sync historical events if enabled
    if (process.env.ENABLE_HISTORICAL_SYNC === 'true') {
      const fromBlock = parseInt(process.env.SYNC_FROM_BLOCK) || 0;
      blockchainListener.syncHistoricalEvents(fromBlock).catch(err => {
        logger.error('Historical sync error:', err);
      });
    }
  } catch (error) {
    logger.error('Failed to start blockchain listener:', error);
  }
};

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    eventProcessor = new EventProcessor();
    app.set('eventProcessor', eventProcessor);
    
    app.listen(PORT, () => {
      logger.info(`Event Orchestrator Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      
      startBlockchainListener();
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  
  if (blockchainListener) {
    blockchainListener.stop();
  }
  
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

module.exports = app;

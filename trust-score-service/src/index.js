/**
 * Trust Score Service - Main Application
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const trustScoreRoutes = require('./routes/trustScoreRoutes');
const BlockchainListener = require('./services/BlockchainListener');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Routes
app.get('/', (req, res) => {
  res.json({
    service: 'Trust Score Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      getTrustScore: 'GET /api/trust-score/:wallet',
      getDetailed: 'GET /api/trust-score/:wallet/detailed',
      addTransaction: 'POST /api/trust-score/:wallet/transaction',
      addDispute: 'POST /api/trust-score/:wallet/dispute',
      checkFraud: 'POST /api/trust-score/:wallet/fraud-check',
      getTopTrusted: 'GET /api/trust-score/top',
      getBlacklisted: 'GET /api/trust-score/blacklisted',
      blacklist: 'POST /api/trust-score/:wallet/blacklist',
      removeBlacklist: 'DELETE /api/trust-score/:wallet/blacklist',
      health: 'GET /health'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.use('/api/trust-score', trustScoreRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Initialize blockchain listener
let blockchainListener;

const startBlockchainListener = () => {
  if (!process.env.ETHEREUM_RPC_URL || !process.env.NFT_CONTRACT_ADDRESS) {
    logger.warn('Blockchain listener not configured. Set ETHEREUM_RPC_URL and contract addresses.');
    return;
  }
  
  try {
    // Load contract ABIs
    const nftAbi = require('./abis/NFTContract.json').abi;
    const marketplaceAbi = require('./abis/NFTMarketplace.json').abi;
    
    blockchainListener = new BlockchainListener({
      rpcUrl: process.env.ETHEREUM_RPC_URL,
      nftContractAddress: process.env.NFT_CONTRACT_ADDRESS,
      marketplaceContractAddress: process.env.MARKETPLACE_CONTRACT_ADDRESS,
      nftAbi,
      marketplaceAbi,
      weights: {
        transactions: parseFloat(process.env.WEIGHT_TRANSACTIONS) || 0.25,
        disputes: parseFloat(process.env.WEIGHT_DISPUTES) || 0.20,
        accountAge: parseFloat(process.env.WEIGHT_ACCOUNT_AGE) || 0.15,
        fraudHistory: parseFloat(process.env.WEIGHT_FRAUD_HISTORY) || 0.25,
        behavioral: parseFloat(process.env.WEIGHT_BEHAVIORAL) || 0.15
      }
    });
    
    blockchainListener.start();
    logger.info('Blockchain listener started');
  } catch (error) {
    logger.error('Failed to start blockchain listener:', error);
  }
};

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start Express server
    app.listen(PORT, () => {
      logger.info(`Trust Score Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Start blockchain listener
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

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;

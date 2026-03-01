/**
 * Jest Test Setup
 * Configures test environment and global settings
 */

const { MongoMemoryServer } = require('mongodb-memory-server');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PRICE_PREDICTOR_URL = 'http://localhost:8001';
process.env.FRAUD_DETECTOR_URL = 'http://localhost:8000';
process.env.TRUST_SCORE_URL = 'http://localhost:4000';
process.env.ENABLE_PRICE_PREDICTION = 'true';
process.env.ENABLE_FRAUD_DETECTION = 'true';
process.env.ENABLE_TRUST_SCORE = 'true';
process.env.RETRY_ATTEMPTS = '3';
process.env.RETRY_DELAY = '1000';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Setup MongoDB Memory Server
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  process.env.MONGO_TEST_URI = mongoUri;
});

afterAll(async () => {
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Suppress console logs during tests (optional)
if (process.env.SUPPRESS_LOGS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

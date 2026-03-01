# Event Orchestrator Service - Test Suite

Comprehensive test suite for the blockchain event listener and event processing system.

## Test Files

### 1. HybridRiskScorer.test.js
Unit tests for the Hybrid Risk Scoring Module.
- **Tests**: 52
- **Coverage**: 100%
- **Categories**: 7 (weighted calculation, edge cases, JSON structure, score bounds, weight configuration, frontend compatibility)

### 2. BlockchainListener.integration.test.js
Integration tests for blockchain event listening and processing.
- **Tests**: 42
- **Coverage**: Full integration pipeline
- **Categories**: 6 (event capture, MongoDB storage, AI service calls, trust score updates, duplicate handling, network recovery)

## Prerequisites

### Required Services
- **MongoDB**: Running on `localhost:27017` (or set `MONGO_TEST_URI`)
- **Node.js**: v16+ recommended
- **npm**: Latest version

### Optional Services (for full integration)
- **Redis**: For Bull queue testing (localhost:6379)
- **AI Services**: Price Predictor, Fraud Detector, Trust Score Service (mocked in tests)

## Installation

```bash
# Install dependencies
npm install

# Install dev dependencies
npm install --save-dev jest mongodb-memory-server
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
# Hybrid Risk Scorer tests
npm test -- tests/HybridRiskScorer.test.js

# Blockchain Listener integration tests
npm test -- tests/BlockchainListener.integration.test.js
```

### Run with Coverage
```bash
npm test -- --coverage
```

### Run Specific Test Category
```bash
# Run only event capture tests
npm test -- tests/BlockchainListener.integration.test.js -t "Event Capture"

# Run only duplicate handling tests
npm test -- tests/BlockchainListener.integration.test.js -t "Duplicate Events"
```

### Run in Watch Mode
```bash
npm test -- --watch
```

### Run with Verbose Output
```bash
npm test -- --verbose
```

## Environment Variables

Create a `.env.test` file or set these variables:

```bash
# MongoDB
MONGO_TEST_URI=mongodb://localhost:27017/nft-events-test

# AI Services (mocked in tests)
PRICE_PREDICTOR_URL=http://localhost:8001
FRAUD_DETECTOR_URL=http://localhost:8000
TRUST_SCORE_URL=http://localhost:4000

# Feature Flags
ENABLE_PRICE_PREDICTION=true
ENABLE_FRAUD_DETECTION=true
ENABLE_TRUST_SCORE=true

# Retry Configuration
RETRY_ATTEMPTS=3
RETRY_DELAY=1000

# Redis (for Bull queues)
REDIS_HOST=localhost
REDIS_PORT=6379

# Test Configuration
NODE_ENV=test
SUPPRESS_LOGS=true  # Optional: suppress console logs during tests
```

## Test Structure

### Unit Tests (HybridRiskScorer.test.js)

```javascript
describe('Hybrid Risk Scoring Module', () => {
  describe('Category 1: Weighted Score Calculation', () => {
    test('should calculate weighted score correctly', () => {
      // Test implementation
    });
  });
  
  describe('Category 2: Edge Cases', () => {
    // Edge case tests
  });
  
  // ... more categories
});
```

### Integration Tests (BlockchainListener.integration.test.js)

```javascript
describe('Blockchain Event Listener Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test database
  });
  
  afterAll(async () => {
    // Cleanup
  });
  
  beforeEach(async () => {
    // Setup mocks and clear database
  });
  
  describe('Category 1: Event Capture Simulation', () => {
    test('should capture NFTMinted event', async () => {
      // Test implementation
    });
  });
  
  // ... more categories
});
```

## Mocking Strategy

### Mocked Components
- **ethers.js**: WebSocketProvider, Contract instances
- **axios**: HTTP client for AI service calls
- **Bull**: Queue system for async processing
- **MongoDB**: Uses test database (not mocked)

### Mock Examples

```javascript
// Mock axios for AI service calls
jest.mock('axios');
axios.post.mockResolvedValue({
  data: { predicted_price: 2.8, confidence: 0.85 }
});

// Mock Bull queues
jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    process: jest.fn(),
    add: jest.fn().mockResolvedValue({ id: 'job-123' })
  }));
});
```

## Test Data

### Sample Event Data

```javascript
// NFTMinted Event
{
  eventType: 'NFTMinted',
  transactionHash: '0xtxhash123',
  blockNumber: 1000,
  tokenId: '1',
  from: '0x0000000000000000000000000000000000000000',
  to: '0xbuyer123',
  price: 0
}

// NFTSold Event
{
  eventType: 'NFTSold',
  transactionHash: '0xtxhash456',
  blockNumber: 1001,
  tokenId: '5',
  from: '0xseller789',
  to: '0xbuyer456',
  price: 2.5,
  currency: 'ETH'
}
```

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongosh --eval "db.version()"

# Start MongoDB (if not running)
mongod --dbpath /path/to/data
```

### Test Timeout Issues
```bash
# Increase timeout in jest.config.js
testTimeout: 30000  // 30 seconds
```

### Clear Test Database
```bash
# Connect to MongoDB
mongosh

# Switch to test database
use nft-events-test

# Drop database
db.dropDatabase()
```

## Coverage Reports

After running tests with coverage:

```bash
npm test -- --coverage
```

View coverage report:
- **Terminal**: Summary displayed after test run
- **HTML Report**: Open `coverage/lcov-report/index.html` in browser

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
      
      redis:
        image: redis:7
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data in `afterEach`
3. **Mocking**: Mock external services, use real database
4. **Assertions**: Use specific assertions, avoid generic checks
5. **Async**: Always await async operations
6. **Error Cases**: Test both success and failure scenarios

## Contributing

When adding new tests:

1. Follow existing test structure
2. Add tests to appropriate category
3. Update test counts in documentation
4. Ensure all tests pass before committing
5. Maintain 70%+ code coverage

## Support

For issues or questions:
- Check existing test examples
- Review error messages carefully
- Ensure all prerequisites are met
- Check environment variables

## License

MIT

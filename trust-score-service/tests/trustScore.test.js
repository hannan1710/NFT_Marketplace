/**
 * Trust Score Tests
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/index');
const TrustScore = require('../src/models/TrustScore');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await TrustScore.deleteMany({});
});

describe('Trust Score API', () => {
  const testWallet = '0x1234567890123456789012345678901234567890';
  
  describe('GET /api/trust-score/:wallet', () => {
    it('should create and return trust score for new wallet', async () => {
      const res = await request(app)
        .get(`/api/trust-score/${testWallet}`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.walletAddress).toBe(testWallet.toLowerCase());
      expect(res.body.data.trustScore).toBeDefined();
      expect(res.body.data.trustLevel).toBeDefined();
    });
    
    it('should return 400 for invalid wallet address', async () => {
      const res = await request(app)
        .get('/api/trust-score/invalid')
        .expect(400);
      
      expect(res.body.success).toBe(false);
    });
  });
  
  describe('POST /api/trust-score/:wallet/transaction', () => {
    it('should add transaction and update trust score', async () => {
      const transaction = {
        transactionHash: '0x' + '1'.repeat(64),
        type: 'purchase',
        amount: 1500,
        timestamp: new Date().toISOString()
      };
      
      const res = await request(app)
        .post(`/api/trust-score/${testWallet}/transaction`)
        .send(transaction)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.trustScore).toBeDefined();
    });
    
    it('should return 400 for invalid transaction data', async () => {
      const res = await request(app)
        .post(`/api/trust-score/${testWallet}/transaction`)
        .send({ invalid: 'data' })
        .expect(400);
      
      expect(res.body.success).toBe(false);
    });
  });
  
  describe('POST /api/trust-score/:wallet/dispute', () => {
    it('should add dispute and update trust score', async () => {
      // First create wallet with transaction
      await request(app)
        .post(`/api/trust-score/${testWallet}/transaction`)
        .send({
          transactionHash: '0x' + '1'.repeat(64),
          type: 'purchase',
          amount: 1500
        });
      
      const dispute = {
        disputeId: 'dispute_001',
        type: 'fraud',
        severity: 'high'
      };
      
      const res = await request(app)
        .post(`/api/trust-score/${testWallet}/dispute`)
        .send(dispute)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.trustScore).toBeLessThan(50); // Should decrease
    });
  });
  
  describe('POST /api/trust-score/:wallet/blacklist', () => {
    it('should blacklist wallet', async () => {
      const res = await request(app)
        .post(`/api/trust-score/${testWallet}/blacklist`)
        .send({ reason: 'Test blacklist' })
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.isBlacklisted).toBe(true);
    });
  });
  
  describe('DELETE /api/trust-score/:wallet/blacklist', () => {
    it('should remove wallet from blacklist', async () => {
      // First blacklist
      await request(app)
        .post(`/api/trust-score/${testWallet}/blacklist`)
        .send({ reason: 'Test' });
      
      // Then remove
      const res = await request(app)
        .delete(`/api/trust-score/${testWallet}/blacklist`)
        .expect(200);
      
      expect(res.body.success).toBe(true);
      expect(res.body.data.isBlacklisted).toBe(false);
    });
  });
});

describe('Trust Score Calculator', () => {
  it('should calculate correct transaction score', () => {
    // Test transaction score calculation
    // Add more specific tests here
  });
  
  it('should calculate correct dispute score', () => {
    // Test dispute score calculation
  });
  
  it('should calculate correct overall score', () => {
    // Test overall score calculation
  });
});

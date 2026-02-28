const request = require('supertest');
const app = require('../src/index');

describe('API Endpoints', () => {
  describe('GET /health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('POST /api/analyze-contract', () => {
    test('should analyze contract successfully', async () => {
      const sourceCode = `
        function withdraw() public {
          msg.sender.call{value: 100}("");
        }
      `;

      const response = await request(app)
        .post('/api/analyze-contract')
        .send({ sourceCode, contractName: 'TestContract' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('contractName');
      expect(response.body.data).toHaveProperty('vulnerabilities');
      expect(response.body.data).toHaveProperty('summary');
    });

    test('should reject empty source code', async () => {
      const response = await request(app)
        .post('/api/analyze-contract')
        .send({ sourceCode: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    test('should reject missing source code', async () => {
      const response = await request(app)
        .post('/api/analyze-contract')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle large contracts', async () => {
      const largeContract = 'function test() public {}\n'.repeat(1000);

      const response = await request(app)
        .post('/api/analyze-contract')
        .send({ sourceCode: largeContract })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/vulnerability-types', () => {
    test('should return vulnerability types', async () => {
      const response = await request(app)
        .get('/api/vulnerability-types')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const firstType = response.body.data[0];
      expect(firstType).toHaveProperty('type');
      expect(firstType).toHaveProperty('severity');
      expect(firstType).toHaveProperty('description');
    });
  });

  describe('GET /api/stats', () => {
    test('should return service statistics', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalAnalyses');
      expect(response.body.data).toHaveProperty('vulnerabilitiesFound');
      expect(response.body.data).toHaveProperty('uptime');
    });
  });

  describe('404 Handler', () => {
    test('should return 404 for unknown endpoint', async () => {
      const response = await request(app)
        .get('/api/unknown-endpoint')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Endpoint not found');
    });
  });
});

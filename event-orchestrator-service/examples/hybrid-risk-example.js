/**
 * Example Usage of Hybrid Risk Scoring Module
 * Demonstrates how to use the HybridRiskScorer in production
 */

const HybridRiskScorer = require('../src/services/HybridRiskScorer');

// ============================================================================
// Example 1: Basic Usage with Default Weights
// ============================================================================

console.log('=== Example 1: Basic Usage ===\n');

const scorer = new HybridRiskScorer();

const transaction1 = {
  aiFraudScore: 65,        // AI detected moderate fraud risk
  contractPenalty: 45,     // Some contract vulnerabilities
  trustScore: 75           // Good trust score
};

const result1 = scorer.calculateRiskScore(transaction1);

console.log('Input:', transaction1);
console.log('Risk Score:', result1.riskScore);
console.log('Risk Level:', result1.riskLevel);
console.log('Summary:', result1.explanation.summary);
console.log('Recommendation:', result1.explanation.recommendation);
console.log('\n');

// ============================================================================
// Example 2: Custom Weight Configuration
// ============================================================================

console.log('=== Example 2: Custom Weights (AI-Heavy) ===\n');

const aiHeavyScorer = new HybridRiskScorer({
  aiFraudScore: 0.7,      // 70% weight on AI
  contractPenalty: 0.2,   // 20% weight on contract
  trustScore: 0.1         // 10% weight on trust
});

const transaction2 = {
  aiFraudScore: 80,
  contractPenalty: 30,
  trustScore: 60
};

const result2 = aiHeavyScorer.calculateRiskScore(transaction2);

console.log('Weights:', aiHeavyScorer.getWeights());
console.log('Input:', transaction2);
console.log('Risk Score:', result2.riskScore);
console.log('Risk Level:', result2.riskLevel);
console.log('\n');

// ============================================================================
// Example 3: Low Risk Transaction
// ============================================================================

console.log('=== Example 3: Low Risk Transaction ===\n');

const lowRiskTx = {
  aiFraudScore: 10,
  contractPenalty: 15,
  trustScore: 95
};

const result3 = scorer.calculateRiskScore(lowRiskTx);

console.log('Input:', lowRiskTx);
console.log('Risk Score:', result3.riskScore);
console.log('Risk Level:', result3.riskLevel);
console.log('Factors:');
result3.explanation.factors.forEach(factor => {
  console.log(`  - ${factor.factor}: ${factor.severity} (contribution: ${factor.contribution})`);
});
console.log('\n');

// ============================================================================
// Example 4: High Risk Transaction
// ============================================================================

console.log('=== Example 4: High Risk Transaction ===\n');

const highRiskTx = {
  aiFraudScore: 95,
  contractPenalty: 85,
  trustScore: 15
};

const result4 = scorer.calculateRiskScore(highRiskTx);

console.log('Input:', highRiskTx);
console.log('Risk Score:', result4.riskScore);
console.log('Risk Level:', result4.riskLevel);
console.log('Recommendation:', result4.explanation.recommendation);
console.log('\n');

// ============================================================================
// Example 5: Dynamic Weight Updates
// ============================================================================

console.log('=== Example 5: Dynamic Weight Updates ===\n');

const dynamicScorer = new HybridRiskScorer();

console.log('Initial weights:', dynamicScorer.getWeights());

const testTx = {
  aiFraudScore: 70,
  contractPenalty: 30,
  trustScore: 50
};

const beforeUpdate = dynamicScorer.calculateRiskScore(testTx);
console.log('Score before update:', beforeUpdate.riskScore);

// Update weights to prioritize contract security
dynamicScorer.updateWeights({
  aiFraudScore: 0.3,
  contractPenalty: 0.6,
  trustScore: 0.1
});

console.log('Updated weights:', dynamicScorer.getWeights());

const afterUpdate = dynamicScorer.calculateRiskScore(testTx);
console.log('Score after update:', afterUpdate.riskScore);
console.log('\n');

// ============================================================================
// Example 6: API Integration Pattern
// ============================================================================

console.log('=== Example 6: API Integration Pattern ===\n');

// Simulating an Express.js route handler
async function assessTransactionRisk(req, res) {
  try {
    const { aiFraudScore, contractPenalty, trustScore } = req.body;

    const scorer = new HybridRiskScorer();
    const result = scorer.calculateRiskScore({
      aiFraudScore,
      contractPenalty,
      trustScore
    });

    // Return frontend-compatible response
    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

// Simulate API call
const mockReq = {
  body: {
    aiFraudScore: 55,
    contractPenalty: 40,
    trustScore: 70
  }
};

const mockRes = {
  json: (data) => {
    console.log('API Response:');
    console.log(JSON.stringify(data, null, 2));
  },
  status: (code) => ({
    json: (data) => {
      console.log(`Error ${code}:`, data);
    }
  })
};

assessTransactionRisk(mockReq, mockRes);
console.log('\n');

// ============================================================================
// Example 7: Batch Processing
// ============================================================================

console.log('=== Example 7: Batch Processing ===\n');

const transactions = [
  { id: 'tx1', aiFraudScore: 20, contractPenalty: 15, trustScore: 85 },
  { id: 'tx2', aiFraudScore: 60, contractPenalty: 50, trustScore: 60 },
  { id: 'tx3', aiFraudScore: 90, contractPenalty: 80, trustScore: 20 }
];

const batchScorer = new HybridRiskScorer();

const results = transactions.map(tx => {
  const { id, ...inputs } = tx;
  const result = batchScorer.calculateRiskScore(inputs);
  return {
    transactionId: id,
    riskScore: result.riskScore,
    riskLevel: result.riskLevel
  };
});

console.log('Batch Results:');
console.table(results);
console.log('\n');

// ============================================================================
// Example 8: Error Handling
// ============================================================================

console.log('=== Example 8: Error Handling ===\n');

try {
  const invalidScorer = new HybridRiskScorer({
    aiFraudScore: 0.6,
    contractPenalty: 0.5,
    trustScore: 0.2  // Sum = 1.3, invalid!
  });
} catch (error) {
  console.log('Weight validation error:', error.message);
}

try {
  scorer.calculateRiskScore({
    aiFraudScore: 50,
    contractPenalty: 30
    // Missing trustScore
  });
} catch (error) {
  console.log('Input validation error:', error.message);
}

try {
  scorer.calculateRiskScore({
    aiFraudScore: 'high',  // Invalid type
    contractPenalty: 30,
    trustScore: 70
  });
} catch (error) {
  console.log('Type validation error:', error.message);
}

console.log('\n=== Examples Complete ===');

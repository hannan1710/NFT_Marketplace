/**
 * Comprehensive Unit Tests for Hybrid Risk Scoring Module
 * Tests all 7 required categories
 */

const HybridRiskScorer = require('../src/services/HybridRiskScorer');

describe('Hybrid Risk Scoring Module', () => {
  let scorer;

  beforeEach(() => {
    // Initialize with default weights
    scorer = new HybridRiskScorer();
  });

  // ============================================================================
  // CATEGORY 1: Weighted Score Calculation Accuracy
  // ============================================================================

  describe('Category 1: Weighted Score Calculation Accuracy', () => {
    test('should calculate weighted score correctly with default weights', () => {
      const inputs = {
        aiFraudScore: 60,
        contractPenalty: 40,
        trustScore: 80
      };

      const result = scorer.calculateRiskScore(inputs);

      // Expected: (60 * 0.5) + (40 * 0.3) + ((100-80) * 0.2)
      // = 30 + 12 + 4 = 46
      expect(result.riskScore).toBe(46);
      expect(result.riskLevel).toBe('MEDIUM');
    });

    test('should calculate weighted score with custom weights', () => {
      scorer = new HybridRiskScorer({
        aiFraudScore: 0.6,
        contractPenalty: 0.3,
        trustScore: 0.1
      });

      const inputs = {
        aiFraudScore: 50,
        contractPenalty: 30,
        trustScore: 70
      };

      const result = scorer.calculateRiskScore(inputs);

      // Expected: (50 * 0.6) + (30 * 0.3) + ((100-70) * 0.1)
      // = 30 + 9 + 3 = 42
      expect(result.riskScore).toBe(42);
    });

    test('should handle equal weights correctly', () => {
      scorer = new HybridRiskScorer({
        aiFraudScore: 0.333,
        contractPenalty: 0.333,
        trustScore: 0.334
      });

      const inputs = {
        aiFraudScore: 60,
        contractPenalty: 60,
        trustScore: 40 // High trust (60 risk)
      };

      const result = scorer.calculateRiskScore(inputs);

      // Expected: (60 * 0.333) + (60 * 0.333) + (60 * 0.334)
      // ≈ 19.98 + 19.98 + 20.04 = 60
      expect(result.riskScore).toBeCloseTo(60, 0);
    });
  

    test('should verify component contributions sum to final score', () => {
      const inputs = {
        aiFraudScore: 70,
        contractPenalty: 50,
        trustScore: 60
      };

      const result = scorer.calculateRiskScore(inputs);

      const aiContribution = result.components.aiFraudScore * scorer.weights.aiFraudScore;
      const contractContribution = result.components.contractPenalty * scorer.weights.contractPenalty;
      const trustContribution = result.components.trustRiskContribution * scorer.weights.trustScore;

      const calculatedTotal = aiContribution + contractContribution + trustContribution;

      expect(calculatedTotal).toBeCloseTo(result.riskScore, 1);
    });

    test('should maintain precision with decimal inputs', () => {
      const inputs = {
        aiFraudScore: 45.67,
        contractPenalty: 32.89,
        trustScore: 78.12
      };

      const result = scorer.calculateRiskScore(inputs);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(typeof result.riskScore).toBe('number');
    });
  });

  // ============================================================================
  // CATEGORY 2: Edge Case - All Zero Inputs
  // ============================================================================

  describe('Category 2: Edge Case - All Zero Inputs', () => {
    test('should handle all zero inputs correctly', () => {
      const inputs = {
        aiFraudScore: 0,
        contractPenalty: 0,
        trustScore: 0
      };

      const result = scorer.calculateRiskScore(inputs);

      // With all zeros: (0 * 0.5) + (0 * 0.3) + (100 * 0.2) = 20
      // Trust score 0 means high risk (100 - 0 = 100)
      expect(result.riskScore).toBe(20);
      expect(result.riskLevel).toBe('LOW');
    });

    test('should return valid structure with zero inputs', () => {
      const inputs = {
        aiFraudScore: 0,
        contractPenalty: 0,
        trustScore: 0
      };

      const result = scorer.calculateRiskScore(inputs);

      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('weights');
      expect(result).toHaveProperty('timestamp');
    });

    test('should have correct component values with zero inputs', () => {
      const inputs = {
        aiFraudScore: 0,
        contractPenalty: 0,
        trustScore: 0
      };

      const result = scorer.calculateRiskScore(inputs);

      expect(result.components.aiFraudScore).toBe(0);
      expect(result.components.contractPenalty).toBe(0);
      expect(result.components.trustScore).toBe(0);
      expect(result.components.trustRiskContribution).toBe(100);
    });
  });

  // ============================================================================
  // CATEGORY 3: Edge Case - Max Risk Inputs
  // ============================================================================

  describe('Category 3: Edge Case - Max Risk Inputs', () => {
    test('should handle maximum risk inputs correctly', () => {
      const inputs = {
        aiFraudScore: 100,
        contractPenalty: 100,
        trustScore: 0 // Zero trust = maximum risk
      };

      const result = scorer.calculateRiskScore(inputs);

      // Expected: (100 * 0.5) + (100 * 0.3) + (100 * 0.2) = 100
      expect(result.riskScore).toBe(100);
      expect(result.riskLevel).toBe('HIGH');
    });

    test('should classify max risk as HIGH', () => {
      const inputs = {
        aiFraudScore: 100,
        contractPenalty: 100,
        trustScore: 0
      };

      const result = scorer.calculateRiskScore(inputs);

      expect(result.riskLevel).toBe('HIGH');
      expect(result.explanation.riskLevel).toBe('HIGH');
    });

    test('should handle values above 100 by clamping', () => {
      const inputs = {
        aiFraudScore: 150,
        contractPenalty: 120,
        trustScore: -10
      };

      const result = scorer.calculateRiskScore(inputs);

      // Should clamp to 100
      expect(result.riskScore).toBe(100);
      expect(result.components.aiFraudScore).toBe(100);
      expect(result.components.contractPenalty).toBe(100);
    });

    test('should provide HIGH severity factors for max risk', () => {
      const inputs = {
        aiFraudScore: 100,
        contractPenalty: 100,
        trustScore: 0
      };

      const result = scorer.calculateRiskScore(inputs);

      const highSeverityFactors = result.explanation.factors.filter(
        f => f.severity === 'HIGH'
      );

      expect(highSeverityFactors.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // CATEGORY 4: Explanation JSON Structure Validation
  // ============================================================================

  describe('Category 4: Explanation JSON Structure Validation', () => {
    test('should return valid JSON structure', () => {
      const inputs = {
        aiFraudScore: 50,
        contractPenalty: 30,
        trustScore: 70
      };

      const result = scorer.calculateRiskScore(inputs);

      // Should be serializable to JSON
      expect(() => JSON.stringify(result)).not.toThrow();
      expect(() => JSON.parse(JSON.stringify(result))).not.toThrow();
    });

    test('should have all required top-level fields', () => {
      const inputs = {
        aiFraudScore: 50,
        contractPenalty: 30,
        trustScore: 70
      };

      const result = scorer.calculateRiskScore(inputs);

      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('riskLevel');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('weights');
      expect(result).toHaveProperty('timestamp');
    });

    test('should have valid explanation structure', () => {
      const inputs = {
        aiFraudScore: 50,
        contractPenalty: 30,
        trustScore: 70
      };

      const result = scorer.calculateRiskScore(inputs);

      expect(result.explanation).toHaveProperty('summary');
      expect(result.explanation).toHaveProperty('riskLevel');
      expect(result.explanation).toHaveProperty('finalScore');
      expect(result.explanation).toHaveProperty('factors');
      expect(result.explanation).toHaveProperty('recommendation');

      expect(typeof result.explanation.summary).toBe('string');
      expect(typeof result.explanation.recommendation).toBe('string');
      expect(Array.isArray(result.explanation.factors)).toBe(true);
    });

    test('should have exactly 3 factors in explanation', () => {
      const inputs = {
        aiFraudScore: 50,
        contractPenalty: 30,
        trustScore: 70
      };

      const result = scorer.calculateRiskScore(inputs);

      expect(result.explanation.factors).toHaveLength(3);
    });

    test('should have valid factor structure', () => {
      const inputs = {
        aiFraudScore: 50,
        contractPenalty: 30,
        trustScore: 70
      };

      const result = scorer.calculateRiskScore(inputs);

      result.explanation.factors.forEach(factor => {
        expect(factor).toHaveProperty('factor');
        expect(factor).toHaveProperty('severity');
        expect(factor).toHaveProperty('score');
        expect(factor).toHaveProperty('weight');
        expect(factor).toHaveProperty('contribution');
        expect(factor).toHaveProperty('description');

        expect(typeof factor.factor).toBe('string');
        expect(['LOW', 'MEDIUM', 'HIGH']).toContain(factor.severity);
        expect(typeof factor.score).toBe('number');
        expect(typeof factor.weight).toBe('number');
        expect(typeof factor.description).toBe('string');
      });
    });

    test('should have valid components structure', () => {
      const inputs = {
        aiFraudScore: 50,
        contractPenalty: 30,
        trustScore: 70
      };

      const result = scorer.calculateRiskScore(inputs);

      expect(result.components).toHaveProperty('aiFraudScore');
      expect(result.components).toHaveProperty('contractPenalty');
      expect(result.components).toHaveProperty('trustScore');
      expect(result.components).toHaveProperty('trustRiskContribution');

      expect(typeof result.components.aiFraudScore).toBe('number');
      expect(typeof result.components.contractPenalty).toBe('number');
      expect(typeof result.components.trustScore).toBe('number');
      expect(typeof result.components.trustRiskContribution).toBe('number');
    });

    test('should have valid timestamp format', () => {
      const inputs = {
        aiFraudScore: 50,
        contractPenalty: 30,
        trustScore: 70
      };

      const result = scorer.calculateRiskScore(inputs);

      expect(typeof result.timestamp).toBe('string');
      expect(() => new Date(result.timestamp)).not.toThrow();
      expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
    });
  });

  // ============================================================================
  // CATEGORY 5: Score Always Between 0-100
  // ============================================================================

  describe('Category 5: Score Always Between 0-100', () => {
    test('should keep score within bounds for normal inputs', () => {
      const testCases = [
        { aiFraudScore: 0, contractPenalty: 0, trustScore: 100 },
        { aiFraudScore: 50, contractPenalty: 50, trustScore: 50 },
        { aiFraudScore: 100, contractPenalty: 100, trustScore: 0 },
        { aiFraudScore: 25, contractPenalty: 75, trustScore: 80 },
        { aiFraudScore: 90, contractPenalty: 10, trustScore: 30 }
      ];

      testCases.forEach(inputs => {
        const result = scorer.calculateRiskScore(inputs);
        expect(result.riskScore).toBeGreaterThanOrEqual(0);
        expect(result.riskScore).toBeLessThanOrEqual(100);
      });
    });

    test('should clamp negative inputs to 0', () => {
      const inputs = {
        aiFraudScore: -50,
        contractPenalty: -30,
        trustScore: -20
      };

      const result = scorer.calculateRiskScore(inputs);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(result.components.aiFraudScore).toBe(0);
      expect(result.components.contractPenalty).toBe(0);
    });

    test('should clamp inputs above 100', () => {
      const inputs = {
        aiFraudScore: 150,
        contractPenalty: 200,
        trustScore: 120
      };

      const result = scorer.calculateRiskScore(inputs);

      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(result.components.aiFraudScore).toBe(100);
      expect(result.components.contractPenalty).toBe(100);
      expect(result.components.trustScore).toBe(100);
    });

    test('should handle extreme values correctly', () => {
      const extremeCases = [
        { aiFraudScore: -1000, contractPenalty: 0, trustScore: 50 },
        { aiFraudScore: 1000, contractPenalty: 50, trustScore: 50 },
        { aiFraudScore: 50, contractPenalty: -500, trustScore: 50 },
        { aiFraudScore: 50, contractPenalty: 500, trustScore: 50 }
      ];

      extremeCases.forEach(inputs => {
        const result = scorer.calculateRiskScore(inputs);
        expect(result.riskScore).toBeGreaterThanOrEqual(0);
        expect(result.riskScore).toBeLessThanOrEqual(100);
      });
    });

    test('should maintain bounds with custom weights', () => {
      scorer = new HybridRiskScorer({
        aiFraudScore: 0.7,
        contractPenalty: 0.2,
        trustScore: 0.1
      });

      const inputs = {
        aiFraudScore: 95,
        contractPenalty: 85,
        trustScore: 10
      };

      const result = scorer.calculateRiskScore(inputs);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });
  });

  // ============================================================================
  // CATEGORY 6: Weight Configuration Testing
  // ============================================================================

  describe('Category 6: Weight Configuration Testing', () => {
    test('should accept valid custom weights', () => {
      expect(() => {
        new HybridRiskScorer({
          aiFraudScore: 0.6,
          contractPenalty: 0.3,
          trustScore: 0.1
        });
      }).not.toThrow();
    });

    test('should reject weights that do not sum to 1.0', () => {
      expect(() => {
        new HybridRiskScorer({
          aiFraudScore: 0.5,
          contractPenalty: 0.3,
          trustScore: 0.3 // Sum = 1.1
        });
      }).toThrow(/must sum to 1\.0/);
    });

    test('should reject negative weights', () => {
      expect(() => {
        new HybridRiskScorer({
          aiFraudScore: -0.1,
          contractPenalty: 0.6,
          trustScore: 0.5
        });
      }).toThrow(/must be between 0 and 1/);
    });

    test('should reject weights greater than 1', () => {
      expect(() => {
        new HybridRiskScorer({
          aiFraudScore: 1.5,
          contractPenalty: -0.3,
          trustScore: -0.2
        });
      }).toThrow(/must be between 0 and 1/);
    });

    test('should allow updating weights dynamically', () => {
      scorer.updateWeights({
        aiFraudScore: 0.4,
        contractPenalty: 0.4,
        trustScore: 0.2
      });

      const weights = scorer.getWeights();

      expect(weights.aiFraudScore).toBe(0.4);
      expect(weights.contractPenalty).toBe(0.4);
      expect(weights.trustScore).toBe(0.2);
    });

    test('should validate weights after update', () => {
      expect(() => {
        scorer.updateWeights({
          aiFraudScore: 0.8,
          contractPenalty: 0.3,
          trustScore: 0.2 // Sum = 1.3
        });
      }).toThrow(/must sum to 1\.0/);
    });

    test('should reject partial weight updates that break sum', () => {
      // Partial updates that don't maintain sum = 1.0 should fail
      expect(() => {
        scorer.updateWeights({
          aiFraudScore: 0.6
          // Other weights remain 0.3 and 0.2, sum = 1.1
        });
      }).toThrow(/must sum to 1\.0/);
    });

    test('should return copy of weights, not reference', () => {
      const weights1 = scorer.getWeights();
      weights1.aiFraudScore = 0.9;

      const weights2 = scorer.getWeights();

      expect(weights2.aiFraudScore).toBe(0.5); // Original value
    });

    test('should handle floating point precision in weight validation', () => {
      expect(() => {
        new HybridRiskScorer({
          aiFraudScore: 0.333,
          contractPenalty: 0.333,
          trustScore: 0.334 // Sum = 1.0
        });
      }).not.toThrow();
    });

    test('should affect score calculation when weights change', () => {
      const inputs = {
        aiFraudScore: 80,
        contractPenalty: 20,
        trustScore: 50
      };

      const result1 = scorer.calculateRiskScore(inputs);

      scorer.updateWeights({
        aiFraudScore: 0.8,
        contractPenalty: 0.1,
        trustScore: 0.1
      });

      const result2 = scorer.calculateRiskScore(inputs);

      expect(result1.riskScore).not.toBe(result2.riskScore);
      expect(result2.riskScore).toBeGreaterThan(result1.riskScore);
    });
  });

  // ============================================================================
  // CATEGORY 7: Frontend-Compatible Output Format
  // ============================================================================

  describe('Category 7: Frontend-Compatible Output Format', () => {
    test('should return JSON-serializable output', () => {
      const inputs = {
        aiFraudScore: 65,
        contractPenalty: 45,
        trustScore: 75
      };

      const result = scorer.calculateRiskScore(inputs);
      const json = JSON.stringify(result);
      const parsed = JSON.parse(json);

      expect(parsed.riskScore).toBe(result.riskScore);
      expect(parsed.riskLevel).toBe(result.riskLevel);
    });

    test('should have numeric values as numbers, not strings', () => {
      const inputs = {
        aiFraudScore: 50,
        contractPenalty: 30,
        trustScore: 70
      };

      const result = scorer.calculateRiskScore(inputs);

      expect(typeof result.riskScore).toBe('number');
      expect(typeof result.components.aiFraudScore).toBe('number');
      expect(typeof result.components.contractPenalty).toBe('number');
      expect(typeof result.components.trustScore).toBe('number');
      expect(typeof result.weights.aiFraudScore).toBe('number');
    });

    test('should have consistent field naming (camelCase)', () => {
      const inputs = {
        aiFraudScore: 50,
        contractPenalty: 30,
        trustScore: 70
      };

      const result = scorer.calculateRiskScore(inputs);

      // Check top-level fields
      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('riskLevel');
      expect(result).not.toHaveProperty('risk_score');
      expect(result).not.toHaveProperty('risk_level');

      // Check nested fields
      expect(result.components).toHaveProperty('aiFraudScore');
      expect(result.components).toHaveProperty('contractPenalty');
      expect(result.components).toHaveProperty('trustScore');
    });

    test('should include timestamp in ISO format', () => {
      const inputs = {
        aiFraudScore: 50,
        contractPenalty: 30,
        trustScore: 70
      };

      const result = scorer.calculateRiskScore(inputs);

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('should have human-readable risk level', () => {
      const testCases = [
        { inputs: { aiFraudScore: 10, contractPenalty: 10, trustScore: 90 }, expected: 'LOW' },
        { inputs: { aiFraudScore: 50, contractPenalty: 50, trustScore: 50 }, expected: 'MEDIUM' },
        { inputs: { aiFraudScore: 90, contractPenalty: 90, trustScore: 10 }, expected: 'HIGH' }
      ];

      testCases.forEach(({ inputs, expected }) => {
        const result = scorer.calculateRiskScore(inputs);
        expect(result.riskLevel).toBe(expected);
        expect(['LOW', 'MEDIUM', 'HIGH']).toContain(result.riskLevel);
      });
    });

    test('should provide actionable recommendation text', () => {
      const inputs = {
        aiFraudScore: 50,
        contractPenalty: 30,
        trustScore: 70
      };

      const result = scorer.calculateRiskScore(inputs);

      expect(result.explanation.recommendation).toBeTruthy();
      expect(typeof result.explanation.recommendation).toBe('string');
      expect(result.explanation.recommendation.length).toBeGreaterThan(0);
    });

    test('should provide summary text', () => {
      const inputs = {
        aiFraudScore: 50,
        contractPenalty: 30,
        trustScore: 70
      };

      const result = scorer.calculateRiskScore(inputs);

      expect(result.explanation.summary).toBeTruthy();
      expect(typeof result.explanation.summary).toBe('string');
      expect(result.explanation.summary).toContain(result.riskScore.toString());
    });

    test('should have no circular references', () => {
      const inputs = {
        aiFraudScore: 50,
        contractPenalty: 30,
        trustScore: 70
      };

      const result = scorer.calculateRiskScore(inputs);

      // Should not throw on circular reference
      expect(() => JSON.stringify(result)).not.toThrow();
    });

    test('should have consistent decimal precision', () => {
      const inputs = {
        aiFraudScore: 45.6789,
        contractPenalty: 32.1234,
        trustScore: 78.9876
      };

      const result = scorer.calculateRiskScore(inputs);

      // All scores should have max 2 decimal places
      expect(result.riskScore.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
      expect(result.components.aiFraudScore.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    });

    test('should be compatible with REST API response', () => {
      const inputs = {
        aiFraudScore: 50,
        contractPenalty: 30,
        trustScore: 70
      };

      const result = scorer.calculateRiskScore(inputs);

      // Simulate API response
      const apiResponse = {
        success: true,
        data: result
      };

      expect(() => JSON.stringify(apiResponse)).not.toThrow();
      expect(apiResponse.data.riskScore).toBe(result.riskScore);
    });
  });

  // ============================================================================
  // ADDITIONAL TESTS: Input Validation & Error Handling
  // ============================================================================

  describe('Additional: Input Validation & Error Handling', () => {
    test('should reject missing inputs', () => {
      expect(() => {
        scorer.calculateRiskScore({
          aiFraudScore: 50,
          contractPenalty: 30
          // Missing trustScore
        });
      }).toThrow(/Missing required fields/);
    });

    test('should reject non-numeric inputs', () => {
      expect(() => {
        scorer.calculateRiskScore({
          aiFraudScore: '50',
          contractPenalty: 30,
          trustScore: 70
        });
      }).toThrow(/must be a valid number/);
    });

    test('should reject null inputs', () => {
      expect(() => {
        scorer.calculateRiskScore(null);
      }).toThrow(/Inputs must be an object/);
    });

    test('should reject NaN inputs', () => {
      expect(() => {
        scorer.calculateRiskScore({
          aiFraudScore: NaN,
          contractPenalty: 30,
          trustScore: 70
        });
      }).toThrow(/must be a valid number/);
    });
  });

  // ============================================================================
  // ADDITIONAL TESTS: Risk Level Classification
  // ============================================================================

  describe('Additional: Risk Level Classification', () => {
    test('should classify LOW risk correctly', () => {
      const inputs = {
        aiFraudScore: 10,
        contractPenalty: 10,
        trustScore: 90
      };

      const result = scorer.calculateRiskScore(inputs);

      expect(result.riskLevel).toBe('LOW');
      expect(result.riskScore).toBeLessThan(40);
    });

    test('should classify MEDIUM risk correctly', () => {
      const inputs = {
        aiFraudScore: 50,
        contractPenalty: 50,
        trustScore: 50
      };

      const result = scorer.calculateRiskScore(inputs);

      expect(result.riskLevel).toBe('MEDIUM');
      expect(result.riskScore).toBeGreaterThanOrEqual(40);
      expect(result.riskScore).toBeLessThan(70);
    });

    test('should classify HIGH risk correctly', () => {
      const inputs = {
        aiFraudScore: 90,
        contractPenalty: 90,
        trustScore: 10
      };

      const result = scorer.calculateRiskScore(inputs);

      expect(result.riskLevel).toBe('HIGH');
      expect(result.riskScore).toBeGreaterThanOrEqual(70);
    });

    test('should handle boundary cases for risk levels', () => {
      // Test boundary at 40 (LOW/MEDIUM) using default scorer
      const result39 = scorer.calculateRiskScore({
        aiFraudScore: 20,
        contractPenalty: 20,
        trustScore: 80 // Results in score ~39
      });
      expect(result39.riskLevel).toBe('LOW');

      const result40 = scorer.calculateRiskScore({
        aiFraudScore: 40,
        contractPenalty: 40,
        trustScore: 60 // Results in score ~40
      });
      expect(result40.riskLevel).toBe('MEDIUM');

      // Test boundary at 70 (MEDIUM/HIGH)
      const result69 = scorer.calculateRiskScore({
        aiFraudScore: 69,
        contractPenalty: 69,
        trustScore: 31 // Results in score ~69
      });
      expect(result69.riskLevel).toBe('MEDIUM');

      const result70 = scorer.calculateRiskScore({
        aiFraudScore: 70,
        contractPenalty: 70,
        trustScore: 30 // Results in score ~70
      });
      expect(result70.riskLevel).toBe('HIGH');
    });
  });
});

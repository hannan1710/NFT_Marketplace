/**
 * Hybrid Risk Scoring Module
 * Combines AI fraud score, smart contract validation penalty, and trust score
 * to produce a comprehensive risk assessment for NFT transactions
 */

class HybridRiskScorer {
  constructor(config = {}) {
    // Default weights (must sum to 1.0)
    this.weights = {
      aiFraudScore: config.aiFraudScore || 0.5,
      contractPenalty: config.contractPenalty || 0.3,
      trustScore: config.trustScore || 0.2
    };

    // Validate weights sum to 1.0
    this._validateWeights();
  }

  /**
   * Calculate hybrid risk score
   * @param {Object} inputs - Risk scoring inputs
   * @param {number} inputs.aiFraudScore - AI fraud detection score (0-100)
   * @param {number} inputs.contractPenalty - Smart contract validation penalty (0-100)
   * @param {number} inputs.trustScore - Trust score (0-100, inverted for risk)
   * @returns {Object} Risk assessment with score and explanation
   */
  calculateRiskScore(inputs) {
    // Validate inputs
    this._validateInputs(inputs);

    const { aiFraudScore, contractPenalty, trustScore } = inputs;

    // Normalize all inputs to 0-100 scale
    const normalizedAI = this._normalizeScore(aiFraudScore);
    const normalizedContract = this._normalizeScore(contractPenalty);
    // Trust score is inverted (high trust = low risk)
    const normalizedTrust = 100 - this._normalizeScore(trustScore);

    // Calculate weighted risk score
    const weightedScore = 
      (normalizedAI * this.weights.aiFraudScore) +
      (normalizedContract * this.weights.contractPenalty) +
      (normalizedTrust * this.weights.trustScore);

    // Ensure score is within bounds
    const finalScore = this._clampScore(weightedScore);

    // Determine risk level
    const riskLevel = this._determineRiskLevel(finalScore);

    // Build explanation
    const explanation = this._buildExplanation({
      aiFraudScore: normalizedAI,
      contractPenalty: normalizedContract,
      trustScore: normalizedTrust,
      finalScore,
      riskLevel
    });

    return {
      riskScore: parseFloat(finalScore.toFixed(2)),
      riskLevel,
      explanation,
      components: {
        aiFraudScore: parseFloat(normalizedAI.toFixed(2)),
        contractPenalty: parseFloat(normalizedContract.toFixed(2)),
        trustScore: parseFloat((100 - normalizedTrust).toFixed(2)), // Original trust score
        trustRiskContribution: parseFloat(normalizedTrust.toFixed(2))
      },
      weights: { ...this.weights },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Update scoring weights
   * @param {Object} newWeights - New weight configuration
   */
  updateWeights(newWeights) {
    this.weights = { ...this.weights, ...newWeights };
    this._validateWeights();
  }

  /**
   * Get current weight configuration
   * @returns {Object} Current weights
   */
  getWeights() {
    return { ...this.weights };
  }

  /**
   * Validate that weights sum to 1.0
   * @private
   */
  _validateWeights() {
    const sum = Object.values(this.weights).reduce((a, b) => a + b, 0);
    const tolerance = 0.001; // Allow small floating point errors

    if (Math.abs(sum - 1.0) > tolerance) {
      throw new Error(
        `Weights must sum to 1.0, got ${sum.toFixed(3)}. ` +
        `Current weights: ${JSON.stringify(this.weights)}`
      );
    }

    // Validate individual weights are positive
    Object.entries(this.weights).forEach(([key, value]) => {
      if (value < 0 || value > 1) {
        throw new Error(`Weight ${key} must be between 0 and 1, got ${value}`);
      }
    });
  }

  /**
   * Validate input values
   * @private
   */
  _validateInputs(inputs) {
    if (!inputs || typeof inputs !== 'object') {
      throw new Error('Inputs must be an object');
    }

    const required = ['aiFraudScore', 'contractPenalty', 'trustScore'];
    const missing = required.filter(field => !(field in inputs));

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Validate each input is a number
    required.forEach(field => {
      const value = inputs[field];
      if (typeof value !== 'number' || isNaN(value)) {
        throw new Error(`${field} must be a valid number, got ${value}`);
      }
    });
  }

  /**
   * Normalize score to 0-100 range
   * @private
   */
  _normalizeScore(score) {
    if (score < 0) return 0;
    if (score > 100) return 100;
    return score;
  }

  /**
   * Clamp score to 0-100 range
   * @private
   */
  _clampScore(score) {
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine risk level based on score
   * @private
   */
  _determineRiskLevel(score) {
    if (score >= 70) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Build detailed explanation
   * @private
   */
  _buildExplanation(data) {
    const { aiFraudScore, contractPenalty, trustScore, finalScore, riskLevel } = data;

    const factors = [];

    // AI Fraud Score analysis
    if (aiFraudScore >= 70) {
      factors.push({
        factor: 'AI Fraud Detection',
        severity: 'HIGH',
        score: aiFraudScore,
        weight: this.weights.aiFraudScore,
        contribution: (aiFraudScore * this.weights.aiFraudScore).toFixed(2),
        description: 'High fraud probability detected by AI model'
      });
    } else if (aiFraudScore >= 40) {
      factors.push({
        factor: 'AI Fraud Detection',
        severity: 'MEDIUM',
        score: aiFraudScore,
        weight: this.weights.aiFraudScore,
        contribution: (aiFraudScore * this.weights.aiFraudScore).toFixed(2),
        description: 'Moderate fraud indicators detected'
      });
    } else {
      factors.push({
        factor: 'AI Fraud Detection',
        severity: 'LOW',
        score: aiFraudScore,
        weight: this.weights.aiFraudScore,
        contribution: (aiFraudScore * this.weights.aiFraudScore).toFixed(2),
        description: 'Low fraud probability'
      });
    }

    // Contract Penalty analysis
    if (contractPenalty >= 70) {
      factors.push({
        factor: 'Smart Contract Validation',
        severity: 'HIGH',
        score: contractPenalty,
        weight: this.weights.contractPenalty,
        contribution: (contractPenalty * this.weights.contractPenalty).toFixed(2),
        description: 'Critical smart contract vulnerabilities detected'
      });
    } else if (contractPenalty >= 40) {
      factors.push({
        factor: 'Smart Contract Validation',
        severity: 'MEDIUM',
        score: contractPenalty,
        weight: this.weights.contractPenalty,
        contribution: (contractPenalty * this.weights.contractPenalty).toFixed(2),
        description: 'Moderate smart contract issues found'
      });
    } else {
      factors.push({
        factor: 'Smart Contract Validation',
        severity: 'LOW',
        score: contractPenalty,
        weight: this.weights.contractPenalty,
        contribution: (contractPenalty * this.weights.contractPenalty).toFixed(2),
        description: 'Smart contract appears secure'
      });
    }

    // Trust Score analysis (inverted)
    const originalTrust = 100 - trustScore;
    if (trustScore >= 70) { // High risk from low trust
      factors.push({
        factor: 'Trust Score',
        severity: 'HIGH',
        score: originalTrust,
        weight: this.weights.trustScore,
        contribution: (trustScore * this.weights.trustScore).toFixed(2),
        description: 'Low trust score indicates high risk'
      });
    } else if (trustScore >= 40) {
      factors.push({
        factor: 'Trust Score',
        severity: 'MEDIUM',
        score: originalTrust,
        weight: this.weights.trustScore,
        contribution: (trustScore * this.weights.trustScore).toFixed(2),
        description: 'Moderate trust level'
      });
    } else {
      factors.push({
        factor: 'Trust Score',
        severity: 'LOW',
        score: originalTrust,
        weight: this.weights.trustScore,
        contribution: (trustScore * this.weights.trustScore).toFixed(2),
        description: 'High trust score reduces risk'
      });
    }

    return {
      summary: this._generateSummary(riskLevel, finalScore),
      riskLevel,
      finalScore: parseFloat(finalScore.toFixed(2)),
      factors,
      recommendation: this._generateRecommendation(riskLevel)
    };
  }

  /**
   * Generate summary text
   * @private
   */
  _generateSummary(riskLevel, score) {
    const summaries = {
      HIGH: `High risk transaction detected (score: ${score.toFixed(2)}/100). Exercise extreme caution.`,
      MEDIUM: `Moderate risk transaction (score: ${score.toFixed(2)}/100). Additional verification recommended.`,
      LOW: `Low risk transaction (score: ${score.toFixed(2)}/100). Transaction appears safe.`
    };
    return summaries[riskLevel];
  }

  /**
   * Generate recommendation
   * @private
   */
  _generateRecommendation(riskLevel) {
    const recommendations = {
      HIGH: 'REJECT or require manual review before proceeding',
      MEDIUM: 'Proceed with caution and additional verification',
      LOW: 'Safe to proceed with transaction'
    };
    return recommendations[riskLevel];
  }
}

module.exports = HybridRiskScorer;

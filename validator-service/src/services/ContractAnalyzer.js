const ReentrancyDetector = require('../detectors/ReentrancyDetector');
const AccessControlDetector = require('../detectors/AccessControlDetector');
const ArithmeticDetector = require('../detectors/ArithmeticDetector');
const StateValidationDetector = require('../detectors/StateValidationDetector');
const { classifyVulnerability } = require('../utils/classifier');

/**
 * Main contract analyzer that orchestrates all detectors
 */
class ContractAnalyzer {
  constructor(sourceCode, contractName = 'Unknown') {
    this.sourceCode = sourceCode;
    this.contractName = contractName;
    this.detectors = [
      new ReentrancyDetector(),
      new AccessControlDetector(),
      new ArithmeticDetector(),
      new StateValidationDetector()
    ];
  }

  /**
   * Analyze the contract and generate a comprehensive report
   */
  analyze() {
    const startTime = Date.now();
    const vulnerabilities = [];

    // Run all detectors
    for (const detector of this.detectors) {
      const findings = detector.detect(this.sourceCode);
      vulnerabilities.push(...findings);
    }

    // Classify and sort vulnerabilities
    const classifiedVulnerabilities = vulnerabilities.map(vuln => 
      classifyVulnerability(vuln)
    );

    // Sort by severity (HIGH -> MEDIUM -> LOW)
    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    classifiedVulnerabilities.sort((a, b) => 
      severityOrder[a.severity] - severityOrder[b.severity]
    );

    // Generate summary
    const summary = this._generateSummary(classifiedVulnerabilities);

    // Generate recommendations
    const recommendations = this._generateRecommendations(classifiedVulnerabilities);

    return {
      contractName: this.contractName,
      vulnerabilities: classifiedVulnerabilities,
      summary,
      recommendations,
      metadata: {
        timestamp: new Date().toISOString(),
        detectors: this.detectors.map(d => d.constructor.name),
        linesOfCode: this.sourceCode.split('\n').length
      }
    };
  }

  /**
   * Generate summary statistics
   */
  _generateSummary(vulnerabilities) {
    const summary = {
      totalVulnerabilities: vulnerabilities.length,
      high: 0,
      medium: 0,
      low: 0,
      riskScore: 0
    };

    vulnerabilities.forEach(vuln => {
      summary[vuln.severity.toLowerCase()]++;
    });

    // Calculate risk score (HIGH=10, MEDIUM=5, LOW=1)
    summary.riskScore = (summary.high * 10) + (summary.medium * 5) + (summary.low * 1);

    // Determine overall risk level
    if (summary.high > 0) {
      summary.overallRisk = 'HIGH';
    } else if (summary.medium > 0) {
      summary.overallRisk = 'MEDIUM';
    } else if (summary.low > 0) {
      summary.overallRisk = 'LOW';
    } else {
      summary.overallRisk = 'NONE';
    }

    return summary;
  }

  /**
   * Generate actionable recommendations
   */
  _generateRecommendations(vulnerabilities) {
    const recommendations = [];
    const seen = new Set();

    vulnerabilities.forEach(vuln => {
      if (!seen.has(vuln.type)) {
        seen.add(vuln.type);
        recommendations.push({
          type: vuln.type,
          severity: vuln.severity,
          recommendation: vuln.recommendation,
          priority: vuln.severity === 'HIGH' ? 1 : vuln.severity === 'MEDIUM' ? 2 : 3
        });
      }
    });

    // Sort by priority
    recommendations.sort((a, b) => a.priority - b.priority);

    return recommendations;
  }
}

module.exports = ContractAnalyzer;

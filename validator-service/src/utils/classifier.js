/**
 * Vulnerability classification utility
 * Assigns severity levels and additional metadata
 */

const SEVERITY_LEVELS = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

const VULNERABILITY_SEVERITY_MAP = {
  REENTRANCY: SEVERITY_LEVELS.HIGH,
  ACCESS_CONTROL: SEVERITY_LEVELS.HIGH,
  ARITHMETIC: SEVERITY_LEVELS.MEDIUM,
  STATE_VALIDATION: SEVERITY_LEVELS.MEDIUM,
  UNCHECKED_RETURN: SEVERITY_LEVELS.LOW,
  GAS_OPTIMIZATION: SEVERITY_LEVELS.LOW
};

/**
 * Classify vulnerability with severity and additional metadata
 */
function classifyVulnerability(vulnerability) {
  const severity = VULNERABILITY_SEVERITY_MAP[vulnerability.type] || SEVERITY_LEVELS.MEDIUM;
  
  return {
    ...vulnerability,
    severity,
    impact: getImpactDescription(vulnerability.type, severity),
    exploitability: getExploitability(vulnerability.type),
    confidence: getConfidence(vulnerability.type)
  };
}

/**
 * Get impact description based on vulnerability type
 */
function getImpactDescription(type, severity) {
  const impacts = {
    REENTRANCY: 'Attackers can drain contract funds or manipulate state through recursive calls.',
    ACCESS_CONTROL: 'Unauthorized users can execute privileged functions, potentially compromising the contract.',
    ARITHMETIC: 'Integer overflow/underflow can lead to incorrect calculations and unexpected behavior.',
    STATE_VALIDATION: 'Invalid inputs or states can cause contract malfunction or unexpected behavior.',
    UNCHECKED_RETURN: 'Failed external calls may go unnoticed, leading to incorrect state assumptions.',
    GAS_OPTIMIZATION: 'Inefficient code increases transaction costs for users.'
  };

  return impacts[type] || 'Potential security or functionality issue detected.';
}

/**
 * Get exploitability level
 */
function getExploitability(type) {
  const exploitability = {
    REENTRANCY: 'HIGH',
    ACCESS_CONTROL: 'HIGH',
    ARITHMETIC: 'MEDIUM',
    STATE_VALIDATION: 'MEDIUM',
    UNCHECKED_RETURN: 'LOW',
    GAS_OPTIMIZATION: 'LOW'
  };

  return exploitability[type] || 'MEDIUM';
}

/**
 * Get detection confidence level
 */
function getConfidence(type) {
  // Static analysis has varying confidence levels
  const confidence = {
    REENTRANCY: 'MEDIUM',  // May have false positives
    ACCESS_CONTROL: 'HIGH', // Usually accurate
    ARITHMETIC: 'HIGH',     // Pattern-based, reliable
    STATE_VALIDATION: 'MEDIUM', // Context-dependent
    UNCHECKED_RETURN: 'HIGH',
    GAS_OPTIMIZATION: 'HIGH'
  };

  return confidence[type] || 'MEDIUM';
}

/**
 * Calculate overall risk score for a set of vulnerabilities
 */
function calculateRiskScore(vulnerabilities) {
  const weights = {
    HIGH: 10,
    MEDIUM: 5,
    LOW: 1
  };

  return vulnerabilities.reduce((score, vuln) => {
    return score + (weights[vuln.severity] || 0);
  }, 0);
}

/**
 * Get severity color for UI display
 */
function getSeverityColor(severity) {
  const colors = {
    HIGH: '#dc3545',    // Red
    MEDIUM: '#ffc107',  // Yellow
    LOW: '#17a2b8'      // Blue
  };

  return colors[severity] || '#6c757d'; // Gray
}

module.exports = {
  classifyVulnerability,
  calculateRiskScore,
  getSeverityColor,
  SEVERITY_LEVELS
};

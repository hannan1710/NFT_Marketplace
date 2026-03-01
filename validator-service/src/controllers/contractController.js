const ContractAnalyzer = require('../services/ContractAnalyzer');
const { logger } = require('../utils/logger');

// Service statistics
let stats = {
  totalAnalyses: 0,
  vulnerabilitiesFound: 0,
  startTime: Date.now()
};

/**
 * Analyze smart contract for vulnerabilities
 */
exports.analyzeContract = async (req, res, next) => {
  try {
    const { sourceCode, contractName } = req.body;
    
    logger.info(`Analyzing contract: ${contractName || 'Unnamed'}`);
    
    const startTime = Date.now();
    const analyzer = new ContractAnalyzer(sourceCode, contractName);
    const report = analyzer.analyze();
    const analysisTime = Date.now() - startTime;
    
    // Update statistics
    stats.totalAnalyses++;
    stats.vulnerabilitiesFound += report.summary.totalVulnerabilities;
    
    logger.info(`Analysis completed in ${analysisTime}ms - Found ${report.summary.totalVulnerabilities} vulnerabilities`);
    
    res.json({
      success: true,
      data: {
        contractName: contractName || 'UserContract',
        vulnerabilities: report.vulnerabilities.map(v => ({
          type: v.type,
          severity: v.severity.charAt(0) + v.severity.slice(1).toLowerCase(), // HIGH -> High
          description: v.description,
          location: v.location || 'N/A'
        })),
        summary: {
          total: report.summary.totalVulnerabilities,
          high: report.summary.high,
          medium: report.summary.medium,
          low: report.summary.low
        },
        metadata: {
          ...report.metadata,
          analysisTime: `${analysisTime}ms`
        }
      }
    });
  } catch (error) {
    logger.error('Error analyzing contract:', error);
    next(error);
  }
};

/**
 * Get vulnerability types
 */
exports.getVulnerabilityTypes = (req, res) => {
  const vulnerabilityTypes = [
    {
      type: 'REENTRANCY',
      severity: 'HIGH',
      description: 'Potential reentrancy vulnerability detected',
      patterns: [
        'External call before state change',
        'Missing reentrancy guard',
        'Unprotected external call'
      ]
    },
    {
      type: 'ACCESS_CONTROL',
      severity: 'HIGH',
      description: 'Improper access control detected',
      patterns: [
        'Missing access modifier',
        'Public function should be internal/private',
        'Missing onlyOwner or role check'
      ]
    },
    {
      type: 'ARITHMETIC',
      severity: 'MEDIUM',
      description: 'Potential arithmetic vulnerability',
      patterns: [
        'Unchecked arithmetic operation',
        'Integer overflow/underflow risk',
        'Division before multiplication'
      ]
    },
    {
      type: 'STATE_VALIDATION',
      severity: 'MEDIUM',
      description: 'Missing state validation',
      patterns: [
        'Missing zero address check',
        'Missing input validation',
        'Missing state check'
      ]
    },
    {
      type: 'UNCHECKED_RETURN',
      severity: 'LOW',
      description: 'Unchecked return value',
      patterns: [
        'Call return value not checked',
        'Transfer return value ignored'
      ]
    },
    {
      type: 'GAS_OPTIMIZATION',
      severity: 'LOW',
      description: 'Gas optimization opportunity',
      patterns: [
        'Storage variable in loop',
        'Redundant storage read',
        'Inefficient loop'
      ]
    }
  ];
  
  res.json({
    success: true,
    data: vulnerabilityTypes
  });
};

/**
 * Get service statistics
 */
exports.getStats = (req, res) => {
  const uptime = Date.now() - stats.startTime;
  
  res.json({
    success: true,
    data: {
      totalAnalyses: stats.totalAnalyses,
      vulnerabilitiesFound: stats.vulnerabilitiesFound,
      averageVulnerabilitiesPerContract: stats.totalAnalyses > 0 
        ? (stats.vulnerabilitiesFound / stats.totalAnalyses).toFixed(2)
        : 0,
      uptime: `${Math.floor(uptime / 1000)}s`,
      startTime: new Date(stats.startTime).toISOString()
    }
  });
};

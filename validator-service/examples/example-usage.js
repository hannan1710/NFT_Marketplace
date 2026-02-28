const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

/**
 * Example 1: Analyze a vulnerable contract
 */
async function analyzeVulnerableContract() {
  console.log('=== Example 1: Vulnerable Contract ===\n');

  const vulnerableContract = `
    pragma solidity ^0.8.0;
    
    contract VulnerableBank {
      mapping(address => uint) public balances;
      
      function deposit() public payable {
        balances[msg.sender] += msg.value;
      }
      
      function withdraw() public {
        uint amount = balances[msg.sender];
        msg.sender.call{value: amount}("");
        balances[msg.sender] = 0;
      }
      
      function setOwner(address newOwner) public {
        owner = newOwner;
      }
    }
  `;

  try {
    const response = await axios.post(`${API_URL}/analyze-contract`, {
      sourceCode: vulnerableContract,
      contractName: 'VulnerableBank'
    });

    const { data } = response.data;
    
    console.log(`Contract: ${data.contractName}`);
    console.log(`Total Vulnerabilities: ${data.summary.totalVulnerabilities}`);
    console.log(`Risk Score: ${data.summary.riskScore}`);
    console.log(`Overall Risk: ${data.summary.overallRisk}\n`);

    console.log('Vulnerabilities Found:');
    data.vulnerabilities.forEach((vuln, index) => {
      console.log(`\n${index + 1}. ${vuln.title}`);
      console.log(`   Severity: ${vuln.severity}`);
      console.log(`   Line: ${vuln.line}`);
      console.log(`   Description: ${vuln.description}`);
      console.log(`   Recommendation: ${vuln.recommendation}`);
    });

    console.log('\n' + '='.repeat(50) + '\n');
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

/**
 * Example 2: Analyze a safe contract
 */
async function analyzeSafeContract() {
  console.log('=== Example 2: Safe Contract ===\n');

  const safeContract = `
    pragma solidity ^0.8.0;
    
    import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
    import "@openzeppelin/contracts/access/Ownable.sol";
    
    contract SafeBank is ReentrancyGuard, Ownable {
      mapping(address => uint) private balances;
      
      function deposit() external payable {
        require(msg.value > 0, "Must send ETH");
        balances[msg.sender] += msg.value;
      }
      
      function withdraw() external nonReentrant {
        uint amount = balances[msg.sender];
        require(amount > 0, "No balance");
        
        balances[msg.sender] = 0;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
      }
      
      function getBalance() external view returns (uint) {
        return balances[msg.sender];
      }
    }
  `;

  try {
    const response = await axios.post(`${API_URL}/analyze-contract`, {
      sourceCode: safeContract,
      contractName: 'SafeBank'
    });

    const { data } = response.data;
    
    console.log(`Contract: ${data.contractName}`);
    console.log(`Total Vulnerabilities: ${data.summary.totalVulnerabilities}`);
    console.log(`Overall Risk: ${data.summary.overallRisk}`);

    if (data.summary.totalVulnerabilities === 0) {
      console.log('\n✓ No vulnerabilities detected!');
    }

    console.log('\n' + '='.repeat(50) + '\n');
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

/**
 * Example 3: Get vulnerability types
 */
async function getVulnerabilityTypes() {
  console.log('=== Example 3: Vulnerability Types ===\n');

  try {
    const response = await axios.get(`${API_URL}/vulnerability-types`);
    const types = response.data.data;

    console.log(`Total Vulnerability Types: ${types.length}\n`);

    types.forEach((type, index) => {
      console.log(`${index + 1}. ${type.type}`);
      console.log(`   Severity: ${type.severity}`);
      console.log(`   Description: ${type.description}`);
      console.log(`   Patterns: ${type.patterns.join(', ')}\n`);
    });

    console.log('='.repeat(50) + '\n');
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

/**
 * Example 4: Get service statistics
 */
async function getStatistics() {
  console.log('=== Example 4: Service Statistics ===\n');

  try {
    const response = await axios.get(`${API_URL}/stats`);
    const stats = response.data.data;

    console.log(`Total Analyses: ${stats.totalAnalyses}`);
    console.log(`Vulnerabilities Found: ${stats.vulnerabilitiesFound}`);
    console.log(`Average per Contract: ${stats.averageVulnerabilitiesPerContract}`);
    console.log(`Uptime: ${stats.uptime}`);
    console.log(`Started: ${stats.startTime}`);

    console.log('\n' + '='.repeat(50) + '\n');
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

/**
 * Run all examples
 */
async function runExamples() {
  console.log('\n' + '='.repeat(50));
  console.log('Smart Contract Validator - Usage Examples');
  console.log('='.repeat(50) + '\n');

  await analyzeVulnerableContract();
  await analyzeSafeContract();
  await getVulnerabilityTypes();
  await getStatistics();

  console.log('Examples completed!');
}

// Run if called directly
if (require.main === module) {
  runExamples().catch(console.error);
}

module.exports = {
  analyzeVulnerableContract,
  analyzeSafeContract,
  getVulnerabilityTypes,
  getStatistics
};

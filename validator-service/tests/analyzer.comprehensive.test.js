const ContractAnalyzer = require('../src/services/ContractAnalyzer');

describe('Smart Contract Analyzer Microservice - Comprehensive Tests', () => {
  
  // ============ 1. Analyze Safe Contract ============
  
  describe('1. Safe Contract Analysis', () => {
    
    it('should return minimal vulnerabilities for a well-structured contract', () => {
      const safeContract = `
        pragma solidity ^0.8.0;
        
        contract SafeVault {
          mapping(address => uint256) private balances;
          
          function deposit() external payable {
            require(msg.value > 0, "Must deposit positive amount");
            balances[msg.sender] += msg.value;
          }
          
          function withdraw(uint256 amount) external {
            require(amount > 0, "Amount must be positive");
            require(balances[msg.sender] >= amount, "Insufficient balance");
            
            balances[msg.sender] -= amount;
            
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "Transfer failed");
          }
          
          function getBalance() external view returns (uint256) {
            return balances[msg.sender];
          }
        }
      `;
      
      const analyzer = new ContractAnalyzer(safeContract, 'SafeVault');
      const report = analyzer.analyze();
      
      expect(report.contractName).toBe('SafeVault');
      // Contract follows checks-effects-interactions pattern, so should have minimal issues
      expect(report.summary.totalVulnerabilities).toBeLessThanOrEqual(2);
      expect(report.summary.high).toBeLessThanOrEqual(2);
    });

    it('should validate report structure for safe contract', () => {
      const safeContract = `
        pragma solidity ^0.8.0;
        contract Safe {
          uint256 private value;
          function getValue() external view returns (uint256) {
            return value;
          }
        }
      `;
      
      const analyzer = new ContractAnalyzer(safeContract, 'Safe');
      const report = analyzer.analyze();
      
      expect(report).toHaveProperty('contractName');
      expect(report).toHaveProperty('vulnerabilities');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('metadata');
      expect(Array.isArray(report.vulnerabilities)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  // ============ 2. Detect Reentrancy Vulnerability ============
  
  describe('2. Reentrancy Detection', () => {
    
    it('should detect classic reentrancy vulnerability', () => {
      const vulnerableContract = `
        pragma solidity ^0.8.0;
        
        contract VulnerableBank {
          mapping(address => uint256) public balances;
          
          function withdraw() public {
            uint256 amount = balances[msg.sender];
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success, "Transfer failed");
            balances[msg.sender] = 0;
          }
        }
      `;
      
      const analyzer = new ContractAnalyzer(vulnerableContract, 'VulnerableBank');
      const report = analyzer.analyze();
      
      expect(report.vulnerabilities.length).toBeGreaterThan(0);
      
      const reentrancyVuln = report.vulnerabilities.find(v => v.type === 'REENTRANCY');
      expect(reentrancyVuln).toBeDefined();
      expect(reentrancyVuln.severity).toBe('HIGH');
      // Can be either "External call before state change" or "Unprotected value transfer"
      expect(['External call before state change', 'Unprotected value transfer', 'Missing reentrancy guard'])
        .toContain(reentrancyVuln.title);
    });

    it('should detect missing reentrancy guard', () => {
      const vulnerableContract = `
        function withdraw(uint256 amount) public {
          require(balances[msg.sender] >= amount);
          balances[msg.sender] -= amount;
          (bool success, ) = msg.sender.call{value: amount}("");
          require(success);
        }
      `;
      
      const analyzer = new ContractAnalyzer(vulnerableContract, 'Test');
      const report = analyzer.analyze();
      
      // Should detect reentrancy issues (either missing guard or unprotected transfer)
      const reentrancyVulns = report.vulnerabilities.filter(v => v.type === 'REENTRANCY');
      expect(reentrancyVulns.length).toBeGreaterThan(0);
      
      const hasGuardOrTransferVuln = reentrancyVulns.some(v => 
        v.title.includes('guard') || v.title.includes('value transfer')
      );
      expect(hasGuardOrTransferVuln).toBe(true);
    });

    it('should detect unprotected value transfer', () => {
      const vulnerableContract = `
        function sendEther(address payable recipient) public {
          recipient.call{value: 1 ether}("");
        }
      `;
      
      const analyzer = new ContractAnalyzer(vulnerableContract, 'Test');
      const report = analyzer.analyze();
      
      const transferVuln = report.vulnerabilities.find(
        v => v.type === 'REENTRANCY' && v.title.includes('value transfer')
      );
      expect(transferVuln).toBeDefined();
    });

    it('should detect multiple reentrancy patterns', () => {
      const multiVulnContract = `
        function withdraw1() public {
          msg.sender.call{value: balances[msg.sender]}("");
          balances[msg.sender] = 0;
        }
        
        function withdraw2() public {
          uint amt = balances[msg.sender];
          msg.sender.transfer(amt);
          balances[msg.sender] = 0;
        }
      `;
      
      const analyzer = new ContractAnalyzer(multiVulnContract, 'Test');
      const report = analyzer.analyze();
      
      const reentrancyVulns = report.vulnerabilities.filter(v => v.type === 'REENTRANCY');
      expect(reentrancyVulns.length).toBeGreaterThan(1);
    });
  });

  // ============ 3. Detect Missing Access Modifiers ============
  
  describe('3. Access Control Detection', () => {
    
    it('should detect missing onlyOwner modifier on critical function', () => {
      const vulnerableContract = `
        contract Vulnerable {
          address public owner;
          
          function withdraw() public {
            payable(msg.sender).transfer(address(this).balance);
          }
        }
      `;
      
      const analyzer = new ContractAnalyzer(vulnerableContract, 'Vulnerable');
      const report = analyzer.analyze();
      
      const accessVuln = report.vulnerabilities.find(v => v.type === 'ACCESS_CONTROL');
      expect(accessVuln).toBeDefined();
      expect(accessVuln.severity).toBe('HIGH');
      expect(accessVuln.title).toContain('Unrestricted critical function');
    });

    it('should detect missing visibility modifier', () => {
      const vulnerableContract = `
        function transfer(address to, uint256 amount) {
          balances[to] += amount;
        }
      `;
      
      const analyzer = new ContractAnalyzer(vulnerableContract, 'Test');
      const report = analyzer.analyze();
      
      const visibilityVuln = report.vulnerabilities.find(
        v => v.type === 'ACCESS_CONTROL' && v.title.includes('visibility')
      );
      expect(visibilityVuln).toBeDefined();
      expect(visibilityVuln.recommendation).toContain('explicit visibility modifier');
    });

    it('should detect unprotected state-changing function', () => {
      const vulnerableContract = `
        function setOwner(address newOwner) public {
          require(newOwner != address(0));
          owner = newOwner;
        }
      `;
      
      const analyzer = new ContractAnalyzer(vulnerableContract, 'Test');
      const report = analyzer.analyze();
      
      // Should detect either access control or state validation issue
      const hasVuln = report.vulnerabilities.some(v => 
        (v.type === 'ACCESS_CONTROL' && v.title.includes('critical function')) ||
        (v.type === 'STATE_VALIDATION')
      );
      expect(hasVuln).toBe(true);
    });

    it('should detect multiple critical functions without access control', () => {
      const vulnerableContract = `
        function mint(address to, uint256 amount) public {
          balances[to] += amount;
        }
        
        function burn(address from, uint256 amount) public {
          balances[from] -= amount;
        }
        
        function pause() public {
          paused = true;
        }
      `;
      
      const analyzer = new ContractAnalyzer(vulnerableContract, 'Test');
      const report = analyzer.analyze();
      
      const accessVulns = report.vulnerabilities.filter(v => v.type === 'ACCESS_CONTROL');
      expect(accessVulns.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ============ 4. Detect Unsafe Math Operations ============
  
  describe('4. Arithmetic Vulnerability Detection', () => {
    
    it('should detect division before multiplication', () => {
      const vulnerableContract = `
        function calculate(uint256 a, uint256 b, uint256 c) public pure returns (uint256) {
          return (a / b) * c;
        }
      `;
      
      const analyzer = new ContractAnalyzer(vulnerableContract, 'Test');
      const report = analyzer.analyze();
      
      const arithmeticVuln = report.vulnerabilities.find(
        v => v.type === 'ARITHMETIC' && v.title.includes('Division before multiplication')
      );
      expect(arithmeticVuln).toBeDefined();
      expect(arithmeticVuln.severity).toBe('MEDIUM');
      expect(arithmeticVuln.recommendation).toContain('multiply before dividing');
    });

    it('should detect unchecked block usage', () => {
      const vulnerableContract = `
        function increment(uint256 x) public pure returns (uint256) {
          unchecked {
            return x + 1;
          }
        }
      `;
      
      const analyzer = new ContractAnalyzer(vulnerableContract, 'Test');
      const report = analyzer.analyze();
      
      const uncheckedVuln = report.vulnerabilities.find(
        v => v.type === 'ARITHMETIC' && v.title.includes('Unchecked')
      );
      expect(uncheckedVuln).toBeDefined();
      expect(uncheckedVuln.recommendation).toContain('Review unchecked block');
    });

    it('should detect modulo without zero check', () => {
      const vulnerableContract = `
        function distribute(uint256 amount, uint256 divisor) public pure returns (uint256) {
          return amount % divisor;
        }
      `;
      
      const analyzer = new ContractAnalyzer(vulnerableContract, 'Test');
      const report = analyzer.analyze();
      
      const moduloVuln = report.vulnerabilities.find(
        v => v.type === 'ARITHMETIC' && v.title.includes('Modulo without zero check')
      );
      expect(moduloVuln).toBeDefined();
    });

    it('should detect unchecked arithmetic in Solidity < 0.8.0', () => {
      const vulnerableContract = `
        pragma solidity ^0.7.0;
        
        function add(uint256 a, uint256 b) public pure returns (uint256) {
          return a + b;
        }
      `;
      
      const analyzer = new ContractAnalyzer(vulnerableContract, 'Test');
      const report = analyzer.analyze();
      
      const uncheckedArithmetic = report.vulnerabilities.find(
        v => v.type === 'ARITHMETIC' && v.title.includes('Unchecked arithmetic')
      );
      expect(uncheckedArithmetic).toBeDefined();
      expect(uncheckedArithmetic.recommendation).toContain('SafeMath');
    });
  });

  // ============ 5. JSON Output Format Validation ============
  
  describe('5. JSON Output Format Validation', () => {
    
    it('should produce valid JSON output', () => {
      const contract = `
        function test() public {
          msg.sender.call{value: 100}("");
        }
      `;
      
      const analyzer = new ContractAnalyzer(contract, 'Test');
      const report = analyzer.analyze();
      
      // Should be serializable to JSON
      expect(() => JSON.stringify(report)).not.toThrow();
      
      const jsonString = JSON.stringify(report);
      const parsed = JSON.parse(jsonString);
      
      expect(parsed).toEqual(report);
    });

    it('should include all required fields in report', () => {
      const contract = `function test() public {}`;
      
      const analyzer = new ContractAnalyzer(contract, 'Test');
      const report = analyzer.analyze();
      
      // Top-level fields
      expect(report).toHaveProperty('contractName');
      expect(report).toHaveProperty('vulnerabilities');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('metadata');
      
      // Summary fields
      expect(report.summary).toHaveProperty('totalVulnerabilities');
      expect(report.summary).toHaveProperty('high');
      expect(report.summary).toHaveProperty('medium');
      expect(report.summary).toHaveProperty('low');
      expect(report.summary).toHaveProperty('riskScore');
      expect(report.summary).toHaveProperty('overallRisk');
      
      // Metadata fields
      expect(report.metadata).toHaveProperty('timestamp');
      expect(report.metadata).toHaveProperty('detectors');
      expect(report.metadata).toHaveProperty('linesOfCode');
    });

    it('should include proper vulnerability structure', () => {
      const contract = `
        function withdraw() public {
          msg.sender.call{value: 100}("");
          balance = 0;
        }
      `;
      
      const analyzer = new ContractAnalyzer(contract, 'Test');
      const report = analyzer.analyze();
      
      if (report.vulnerabilities.length > 0) {
        const vuln = report.vulnerabilities[0];
        
        expect(vuln).toHaveProperty('type');
        expect(vuln).toHaveProperty('title');
        expect(vuln).toHaveProperty('description');
        expect(vuln).toHaveProperty('severity');
        expect(vuln).toHaveProperty('line');
        expect(vuln).toHaveProperty('code');
        expect(vuln).toHaveProperty('recommendation');
        expect(vuln).toHaveProperty('references');
        
        expect(['HIGH', 'MEDIUM', 'LOW']).toContain(vuln.severity);
        expect(Array.isArray(vuln.references)).toBe(true);
      }
    });

    it('should sort vulnerabilities by severity', () => {
      const contract = `
        function test() public {
          uint x = (10 / 2) * 3;
          msg.sender.call{value: 100}("");
          balance = 0;
        }
      `;
      
      const analyzer = new ContractAnalyzer(contract, 'Test');
      const report = analyzer.analyze();
      
      const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      
      for (let i = 0; i < report.vulnerabilities.length - 1; i++) {
        const currentSeverity = severityOrder[report.vulnerabilities[i].severity];
        const nextSeverity = severityOrder[report.vulnerabilities[i + 1].severity];
        expect(currentSeverity).toBeLessThanOrEqual(nextSeverity);
      }
    });

    it('should calculate risk score correctly', () => {
      const contract = `
        function withdraw() public {
          msg.sender.call{value: balance}("");
          balance = 0;
        }
      `;
      
      const analyzer = new ContractAnalyzer(contract, 'Test');
      const report = analyzer.analyze();
      
      const expectedScore = (report.summary.high * 10) + 
                           (report.summary.medium * 5) + 
                           (report.summary.low * 1);
      
      expect(report.summary.riskScore).toBe(expectedScore);
    });
  });

  // ============ 6. Invalid Solidity Input Handling ============
  
  describe('6. Invalid Input Handling', () => {
    
    it('should handle empty contract gracefully', () => {
      const emptyContract = '';
      
      const analyzer = new ContractAnalyzer(emptyContract, 'Empty');
      const report = analyzer.analyze();
      
      expect(report).toBeDefined();
      expect(report.contractName).toBe('Empty');
      expect(report.vulnerabilities).toBeDefined();
      expect(Array.isArray(report.vulnerabilities)).toBe(true);
    });

    it('should handle contract with only comments', () => {
      const commentOnlyContract = `
        // This is a comment
        /* This is a
           multi-line comment */
      `;
      
      const analyzer = new ContractAnalyzer(commentOnlyContract, 'Comments');
      const report = analyzer.analyze();
      
      expect(report).toBeDefined();
      expect(report.summary.totalVulnerabilities).toBe(0);
    });

    it('should handle malformed Solidity code', () => {
      const malformedContract = `
        function test( public {
          uint x = ;
          msg.sender.call
        }
      `;
      
      const analyzer = new ContractAnalyzer(malformedContract, 'Malformed');
      
      // Should not throw error
      expect(() => analyzer.analyze()).not.toThrow();
      
      const report = analyzer.analyze();
      expect(report).toBeDefined();
    });

    it('should handle very long lines', () => {
      const longLine = 'a'.repeat(10000);
      const contract = `function test() public { uint x = ${longLine}; }`;
      
      const analyzer = new ContractAnalyzer(contract, 'LongLine');
      
      expect(() => analyzer.analyze()).not.toThrow();
    });

    it('should handle special characters', () => {
      const specialCharsContract = `
        function test() public {
          string memory s = "Special: @#$%^&*()";
          // Comment with émojis 🚀💎
        }
      `;
      
      const analyzer = new ContractAnalyzer(specialCharsContract, 'Special');
      const report = analyzer.analyze();
      
      expect(report).toBeDefined();
      expect(() => JSON.stringify(report)).not.toThrow();
    });

    it('should handle contract without pragma', () => {
      const noPragmaContract = `
        contract Test {
          function test() public {}
        }
      `;
      
      const analyzer = new ContractAnalyzer(noPragmaContract, 'NoPragma');
      const report = analyzer.analyze();
      
      expect(report).toBeDefined();
    });
  });

  // ============ 7. Performance Test with Large Contract ============
  
  describe('7. Performance Tests', () => {
    
    it('should analyze large contract within reasonable time', () => {
      // Generate a large contract with 100 functions
      let largeContract = 'pragma solidity ^0.8.0;\n\ncontract LargeContract {\n';
      
      for (let i = 0; i < 100; i++) {
        largeContract += `
          function func${i}() public {
            uint x = ${i};
            msg.sender.call{value: x}("");
            balance${i} = 0;
          }
        `;
      }
      
      largeContract += '}';
      
      const analyzer = new ContractAnalyzer(largeContract, 'LargeContract');
      
      const startTime = Date.now();
      const report = analyzer.analyze();
      const endTime = Date.now();
      
      const executionTime = endTime - startTime;
      
      expect(report).toBeDefined();
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(report.metadata.linesOfCode).toBeGreaterThan(100);
      
      console.log(`      ⏱️  Large contract analysis time: ${executionTime}ms`);
      console.log(`      📊 Lines of code: ${report.metadata.linesOfCode}`);
      console.log(`      🔍 Vulnerabilities found: ${report.summary.totalVulnerabilities}`);
    });

    it('should handle deeply nested code structures', () => {
      const deeplyNestedContract = `
        function test() public {
          if (true) {
            if (true) {
              if (true) {
                if (true) {
                  if (true) {
                    msg.sender.call{value: 100}("");
                    balance = 0;
                  }
                }
              }
            }
          }
        }
      `;
      
      const analyzer = new ContractAnalyzer(deeplyNestedContract, 'DeepNesting');
      
      const startTime = Date.now();
      const report = analyzer.analyze();
      const endTime = Date.now();
      
      expect(report).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should analyze contract with many state variables', () => {
      let manyVarsContract = 'contract ManyVars {\n';
      
      for (let i = 0; i < 50; i++) {
        manyVarsContract += `  uint256 public var${i};\n`;
      }
      
      manyVarsContract += `
        function update() public {
          var0 = 1;
          var1 = 2;
        }
      }`;
      
      const analyzer = new ContractAnalyzer(manyVarsContract, 'ManyVars');
      const report = analyzer.analyze();
      
      expect(report).toBeDefined();
    });

    it('should measure performance metrics', () => {
      const contract = `
        function withdraw() public {
          msg.sender.call{value: 100}("");
          balance = 0;
        }
      `;
      
      const analyzer = new ContractAnalyzer(contract, 'Test');
      
      const iterations = 100;
      const times = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = Date.now();
        analyzer.analyze();
        times.push(Date.now() - start);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      console.log(`      📈 Average analysis time: ${avgTime.toFixed(2)}ms`);
      console.log(`      ⬆️  Max time: ${maxTime}ms`);
      console.log(`      ⬇️  Min time: ${minTime}ms`);
      
      expect(avgTime).toBeLessThan(100); // Average should be under 100ms
    });
  });

  // ============ Additional Edge Cases ============
  
  describe('8. Additional Edge Cases', () => {
    
    it('should handle mixed vulnerability severities', () => {
      const mixedContract = `
        function test() public {
          uint x = (10 / 2) * 3;  // MEDIUM
          msg.sender.call{value: 100}("");  // HIGH
          balance = 0;
        }
      `;
      
      const analyzer = new ContractAnalyzer(mixedContract, 'Mixed');
      const report = analyzer.analyze();
      
      expect(report.summary.high).toBeGreaterThan(0);
      expect(report.summary.medium).toBeGreaterThan(0);
      expect(report.summary.overallRisk).toBe('HIGH');
    });

    it('should generate actionable recommendations', () => {
      const contract = `
        function withdraw() public {
          msg.sender.call{value: 100}("");
          balance = 0;
        }
      `;
      
      const analyzer = new ContractAnalyzer(contract, 'Test');
      const report = analyzer.analyze();
      
      expect(report.recommendations.length).toBeGreaterThan(0);
      
      report.recommendations.forEach(rec => {
        expect(rec).toHaveProperty('type');
        expect(rec).toHaveProperty('severity');
        expect(rec).toHaveProperty('recommendation');
        expect(rec).toHaveProperty('priority');
      });
    });

    it('should track metadata correctly', () => {
      const contract = `
        pragma solidity ^0.8.0;
        contract Test {
          function test() public {}
        }
      `;
      
      const analyzer = new ContractAnalyzer(contract, 'Test');
      const report = analyzer.analyze();
      
      expect(report.metadata.timestamp).toBeDefined();
      expect(new Date(report.metadata.timestamp).toString()).not.toBe('Invalid Date');
      expect(report.metadata.detectors.length).toBeGreaterThan(0);
      expect(report.metadata.linesOfCode).toBeGreaterThan(0);
    });
  });
});

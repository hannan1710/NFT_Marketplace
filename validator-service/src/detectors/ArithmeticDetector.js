/**
 * Detector for arithmetic vulnerabilities
 * Checks for unchecked operations and overflow/underflow risks
 */
class ArithmeticDetector {
  constructor() {
    this.name = 'ArithmeticDetector';
  }

  /**
   * Detect arithmetic vulnerabilities
   */
  detect(sourceCode) {
    const vulnerabilities = [];
    const lines = sourceCode.split('\n');

    // Get Solidity version
    const version = this._getSolidityVersion(sourceCode);

    // Pattern 1: Unchecked arithmetic (Solidity < 0.8.0)
    if (version && parseFloat(version) < 0.8) {
      vulnerabilities.push(...this._detectUncheckedArithmetic(lines));
    }

    // Pattern 2: Unchecked blocks in Solidity >= 0.8.0
    vulnerabilities.push(...this._detectUncheckedBlocks(lines));

    // Pattern 3: Division before multiplication
    vulnerabilities.push(...this._detectDivisionBeforeMultiplication(lines));

    // Pattern 4: Modulo with zero check
    vulnerabilities.push(...this._detectModuloWithoutZeroCheck(lines));

    return vulnerabilities;
  }

  /**
   * Get Solidity version from pragma
   */
  _getSolidityVersion(sourceCode) {
    const pragmaMatch = sourceCode.match(/pragma\s+solidity\s+[\^~]?([\d.]+)/);
    return pragmaMatch ? pragmaMatch[1] : null;
  }

  /**
   * Detect unchecked arithmetic operations (for Solidity < 0.8.0)
   */
  _detectUncheckedArithmetic(lines) {
    const vulnerabilities = [];
    const arithmeticPatterns = [
      { pattern: /\w+\s*\+\s*\w+/, operation: 'addition' },
      { pattern: /\w+\s*-\s*\w+/, operation: 'subtraction' },
      { pattern: /\w+\s*\*\s*\w+/, operation: 'multiplication' }
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip comments
      if (line.startsWith('//') || line.startsWith('/*')) {
        continue;
      }

      for (const { pattern, operation } of arithmeticPatterns) {
        if (pattern.test(line)) {
          // Check if SafeMath is used
          const usesSafeMath = line.includes('.add(') || 
                               line.includes('.sub(') || 
                               line.includes('.mul(') ||
                               line.includes('.div(');

          if (!usesSafeMath) {
            vulnerabilities.push({
              type: 'ARITHMETIC',
              title: 'Unchecked arithmetic operation',
              description: `Unchecked ${operation} detected. May cause overflow/underflow in Solidity < 0.8.0.`,
              line: i + 1,
              code: line,
              recommendation: 'Use SafeMath library or upgrade to Solidity 0.8.0+ for automatic overflow checks.',
              references: [
                'https://docs.openzeppelin.com/contracts/4.x/api/utils#SafeMath'
              ]
            });
          }
        }
      }
    }

    return vulnerabilities;
  }

  /**
   * Detect unchecked blocks (Solidity >= 0.8.0)
   */
  _detectUncheckedBlocks(lines) {
    const vulnerabilities = [];
    let inUncheckedBlock = false;
    let uncheckedStartLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.includes('unchecked') && line.includes('{')) {
        inUncheckedBlock = true;
        uncheckedStartLine = i + 1;
      }

      if (inUncheckedBlock && line.includes('}')) {
        vulnerabilities.push({
          type: 'ARITHMETIC',
          title: 'Unchecked arithmetic block',
          description: 'Unchecked block disables overflow/underflow protection. Ensure this is intentional.',
          line: uncheckedStartLine,
          code: lines[uncheckedStartLine - 1].trim(),
          recommendation: 'Review unchecked block for potential overflow/underflow. Only use when gas optimization is critical and safety is guaranteed.',
          references: [
            'https://docs.soliditylang.org/en/latest/control-structures.html#checked-or-unchecked-arithmetic'
          ]
        });
        inUncheckedBlock = false;
      }
    }

    return vulnerabilities;
  }

  /**
   * Detect division before multiplication (precision loss)
   */
  _detectDivisionBeforeMultiplication(lines) {
    const vulnerabilities = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Pattern: (a / b) * c or a / b * c
      const divBeforeMulPattern = /\(?\w+\s*\/\s*\w+\)?\s*\*\s*\w+/;
      
      if (divBeforeMulPattern.test(line)) {
        vulnerabilities.push({
          type: 'ARITHMETIC',
          title: 'Division before multiplication',
          description: 'Division before multiplication can cause precision loss due to integer division.',
          line: i + 1,
          code: line,
          recommendation: 'Reorder operations to multiply before dividing: (a * c) / b instead of (a / b) * c.',
          references: [
            'https://consensys.github.io/smart-contract-best-practices/development-recommendations/solidity-specific/integer-division/'
          ]
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Detect modulo operations without zero check
   */
  _detectModuloWithoutZeroCheck(lines) {
    const vulnerabilities = [];
    const moduloPattern = /\w+\s*%\s*(\w+)/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      const match = line.match(moduloPattern);
      if (match) {
        const divisor = match[1];
        
        // Check if there's a zero check nearby
        const hasZeroCheck = this._checkForZeroValidation(lines, i, divisor);
        
        if (!hasZeroCheck) {
          vulnerabilities.push({
            type: 'ARITHMETIC',
            title: 'Modulo without zero check',
            description: `Modulo operation with '${divisor}' without zero check. Division by zero will revert.`,
            line: i + 1,
            code: line,
            recommendation: `Add require(${divisor} != 0) before modulo operation.`,
            references: [
              'https://docs.soliditylang.org/en/latest/types.html#modulo'
            ]
          });
        }
      }
    }

    return vulnerabilities;
  }

  /**
   * Check for zero validation in nearby lines
   */
  _checkForZeroValidation(lines, lineIndex, variable) {
    // Check 5 lines before
    for (let i = Math.max(0, lineIndex - 5); i < lineIndex; i++) {
      const line = lines[i];
      if (line.includes(`${variable} != 0`) || 
          line.includes(`${variable} > 0`) ||
          line.includes(`require(${variable}`)) {
        return true;
      }
    }
    return false;
  }
}

module.exports = ArithmeticDetector;

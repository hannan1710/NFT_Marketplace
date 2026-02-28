/**
 * Detector for reentrancy vulnerabilities
 * Checks for external calls before state changes
 */
class ReentrancyDetector {
  constructor() {
    this.name = 'ReentrancyDetector';
  }

  /**
   * Detect reentrancy patterns in the contract
   */
  detect(sourceCode) {
    const vulnerabilities = [];
    const lines = sourceCode.split('\n');

    // Pattern 1: External call before state change
    vulnerabilities.push(...this._detectExternalCallBeforeStateChange(lines));

    // Pattern 2: Missing reentrancy guard
    vulnerabilities.push(...this._detectMissingReentrancyGuard(lines, sourceCode));

    // Pattern 3: Unprotected external calls with value transfer
    vulnerabilities.push(...this._detectUnprotectedValueTransfer(lines));

    return vulnerabilities;
  }

  /**
   * Detect external calls before state changes
   */
  _detectExternalCallBeforeStateChange(lines) {
    const vulnerabilities = [];
    const externalCallPatterns = [
      /\.call\s*\{/,
      /\.transfer\s*\(/,
      /\.send\s*\(/,
      /\.delegatecall\s*\(/
    ];

    const stateChangePatterns = [
      /\w+\s*=\s*[^=]/,  // Assignment
      /\w+\+\+/,          // Increment
      /\w+--/,            // Decrement
      /\w+\s*\+=\s*/,     // Add assign
      /\w+\s*-=\s*/       // Subtract assign
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip comments and empty lines
      if (line.startsWith('//') || line.startsWith('/*') || line.length === 0) {
        continue;
      }

      // Check if line contains external call
      const hasExternalCall = externalCallPatterns.some(pattern => pattern.test(line));
      
      if (hasExternalCall) {
        // Look ahead for state changes
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const nextLine = lines[j].trim();
          const hasStateChange = stateChangePatterns.some(pattern => pattern.test(nextLine));
          
          if (hasStateChange) {
            vulnerabilities.push({
              type: 'REENTRANCY',
              title: 'External call before state change',
              description: 'External call detected before state variable update. This may allow reentrancy attacks.',
              line: i + 1,
              code: line,
              recommendation: 'Move state changes before external calls or use ReentrancyGuard modifier.',
              references: [
                'https://consensys.github.io/smart-contract-best-practices/attacks/reentrancy/'
              ]
            });
            break;
          }
        }
      }
    }

    return vulnerabilities;
  }

  /**
   * Detect missing reentrancy guard on functions with external calls
   */
  _detectMissingReentrancyGuard(lines, sourceCode) {
    const vulnerabilities = [];
    const functionPattern = /function\s+(\w+)\s*\([^)]*\)\s*(public|external)?\s*(payable)?\s*(?!.*nonReentrant)/;
    const externalCallPattern = /\.(call|transfer|send|delegatecall)\s*[\({]/;

    let inFunction = false;
    let functionName = '';
    let functionLine = 0;
    let hasExternalCall = false;
    let hasNonReentrant = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect function start
      const functionMatch = line.match(functionPattern);
      if (functionMatch) {
        inFunction = true;
        functionName = functionMatch[1];
        functionLine = i + 1;
        hasExternalCall = false;
        hasNonReentrant = line.includes('nonReentrant');
      }

      // Check for external calls in function
      if (inFunction && externalCallPattern.test(line)) {
        hasExternalCall = true;
      }

      // Detect function end
      if (inFunction && line.includes('}') && this._isClosingBrace(lines, i)) {
        if (hasExternalCall && !hasNonReentrant) {
          vulnerabilities.push({
            type: 'REENTRANCY',
            title: 'Missing reentrancy guard',
            description: `Function '${functionName}' makes external calls but lacks reentrancy protection.`,
            line: functionLine,
            code: lines[functionLine - 1].trim(),
            recommendation: 'Add nonReentrant modifier or use Checks-Effects-Interactions pattern.',
            references: [
              'https://docs.openzeppelin.com/contracts/4.x/api/security#ReentrancyGuard'
            ]
          });
        }
        inFunction = false;
      }
    }

    return vulnerabilities;
  }

  /**
   * Detect unprotected value transfers
   */
  _detectUnprotectedValueTransfer(lines) {
    const vulnerabilities = [];
    const valueTransferPattern = /\.(call|transfer|send)\s*\{?\s*value\s*:/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (valueTransferPattern.test(line)) {
        // Check if in a function with nonReentrant
        const hasProtection = this._checkReentrancyProtection(lines, i);
        
        if (!hasProtection) {
          vulnerabilities.push({
            type: 'REENTRANCY',
            title: 'Unprotected value transfer',
            description: 'ETH transfer without reentrancy protection detected.',
            line: i + 1,
            code: line,
            recommendation: 'Add nonReentrant modifier or implement pull payment pattern.',
            references: [
              'https://consensys.github.io/smart-contract-best-practices/development-recommendations/general/external-calls/'
            ]
          });
        }
      }
    }

    return vulnerabilities;
  }

  /**
   * Check if line is within a function with reentrancy protection
   */
  _checkReentrancyProtection(lines, lineIndex) {
    // Look backwards for function declaration
    for (let i = lineIndex; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.includes('function')) {
        return line.includes('nonReentrant');
      }
    }
    return false;
  }

  /**
   * Check if brace is a closing function brace
   */
  _isClosingBrace(lines, index) {
    // Simple heuristic: check indentation
    const line = lines[index];
    const indent = line.search(/\S/);
    return indent <= 4; // Assuming function-level closing brace
  }
}

module.exports = ReentrancyDetector;

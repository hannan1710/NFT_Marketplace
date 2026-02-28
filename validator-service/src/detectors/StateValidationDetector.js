/**
 * Detector for missing state validation
 * Checks for missing input validation and state checks
 */
class StateValidationDetector {
  constructor() {
    this.name = 'StateValidationDetector';
  }

  /**
   * Detect state validation issues
   */
  detect(sourceCode) {
    const vulnerabilities = [];
    const lines = sourceCode.split('\n');

    // Pattern 1: Missing zero address checks
    vulnerabilities.push(...this._detectMissingZeroAddressCheck(lines));

    // Pattern 2: Missing input validation - DISABLED (too many false positives)
    // vulnerabilities.push(...this._detectMissingInputValidation(lines));

    // Pattern 3: Missing state checks before operations
    vulnerabilities.push(...this._detectMissingStateChecks(lines));

    // Pattern 4: Missing array bounds checks - DISABLED (mappings are safe)
    // vulnerabilities.push(...this._detectMissingArrayBoundsCheck(lines));

    return vulnerabilities;
  }

  /**
   * Detect missing zero address checks
   */
  _detectMissingZeroAddressCheck(lines) {
    const vulnerabilities = [];
    const addressAssignmentPattern = /(\w+)\s*=\s*(\w+);/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip comments
      if (line.startsWith('//') || line.startsWith('/*')) {
        continue;
      }

      const match = line.match(addressAssignmentPattern);
      if (match) {
        const variable = match[1];
        const value = match[2];

        // Check if it's likely an address assignment
        if (variable.toLowerCase().includes('address') || 
            variable.toLowerCase().includes('owner') ||
            variable.toLowerCase().includes('recipient') ||
            value.toLowerCase().includes('address')) {
          
          // Check for zero address validation
          const hasZeroCheck = this._checkForZeroAddressValidation(lines, i, value);
          
          if (!hasZeroCheck) {
            vulnerabilities.push({
              type: 'STATE_VALIDATION',
              title: 'Missing zero address check',
              description: `Address assignment '${variable} = ${value}' without zero address validation.`,
              line: i + 1,
              code: line,
              recommendation: `Add require(${value} != address(0), "Zero address") before assignment.`,
              references: [
                'https://consensys.github.io/smart-contract-best-practices/development-recommendations/solidity-specific/assert-require-revert/'
              ]
            });
          }
        }
      }
    }

    return vulnerabilities;
  }

  /**
   * Detect missing input validation in functions
   */
  _detectMissingInputValidation(lines) {
    const vulnerabilities = [];
    let inFunction = false;
    let functionName = '';
    let functionLine = 0;
    let parameters = [];
    let hasValidation = false;
    let isViewOrPure = false;
    let hasAccessControl = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect function with parameters
      const functionMatch = line.match(/function\s+(\w+)\s*\(([^)]*)\)/);
      if (functionMatch) {
        inFunction = true;
        functionName = functionMatch[1];
        functionLine = i + 1;
        parameters = this._extractParameters(functionMatch[2]);
        hasValidation = false;
        hasAccessControl = false;
        
        // Check if view/pure or has access control in current or next few lines
        isViewOrPure = false;
        for (let j = i; j < Math.min(i + 10, lines.length); j++) {
          const checkLine = lines[j];
          if (checkLine.includes('view') || checkLine.includes('pure')) {
            isViewOrPure = true;
          }
          if (checkLine.includes('onlyRole') || checkLine.includes('onlyOwner')) {
            hasAccessControl = true;
          }
          if (checkLine.includes('{')) break;
        }
      }

      // Check for validation in function body
      if (inFunction && (line.includes('require(') || line.includes('if (') || line.includes('revert'))) {
        hasValidation = true;
      }

      // Detect function end
      if (inFunction && line.includes('}') && this._isClosingBrace(lines, i)) {
        // Only flag if: has address parameters, no validation, not view/pure, not internal/private, no access control
        const functionDeclaration = lines[functionLine - 1];
        const isInternal = functionDeclaration.includes('internal') || functionDeclaration.includes('private');
        const hasAddressParam = parameters.some(p => p.includes('address'));
        
        // Only flag functions with address parameters that need validation
        if (hasAddressParam && !hasValidation && !isViewOrPure && !isInternal && !hasAccessControl) {
          vulnerabilities.push({
            type: 'STATE_VALIDATION',
            title: 'Missing input validation',
            description: `Function '${functionName}' accepts address parameters but has no input validation.`,
            line: functionLine,
            code: lines[functionLine - 1].trim(),
            recommendation: 'Add require() statements to validate address parameters (e.g., check for zero address).',
            references: [
              'https://consensys.github.io/smart-contract-best-practices/development-recommendations/general/external-calls/'
            ]
          });
        }
        inFunction = false;
      }
    }

    return vulnerabilities;
  }

  /**
   * Detect missing state checks before critical operations
   */
  _detectMissingStateChecks(lines) {
    const vulnerabilities = [];
    const criticalOperations = [
      { pattern: /\.transfer\(/, operation: 'transfer' },
      { pattern: /\.send\(/, operation: 'send' },
      { pattern: /selfdestruct\(/, operation: 'selfdestruct' }
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      for (const { pattern, operation } of criticalOperations) {
        if (pattern.test(line)) {
          // Check for state validation before operation
          const hasStateCheck = this._checkForStateValidation(lines, i);
          
          if (!hasStateCheck) {
            vulnerabilities.push({
              type: 'STATE_VALIDATION',
              title: 'Missing state check before critical operation',
              description: `Critical operation '${operation}' without prior state validation.`,
              line: i + 1,
              code: line,
              recommendation: 'Add state checks (require/if statements) before critical operations.',
              references: [
                'https://consensys.github.io/smart-contract-best-practices/development-recommendations/general/external-calls/'
              ]
            });
          }
        }
      }
    }

    return vulnerabilities;
  }

  /**
   * Detect missing array bounds checks
   */
  _detectMissingArrayBoundsCheck(lines) {
    const vulnerabilities = [];
    const arrayAccessPattern = /(\w+)\[(\w+)\]/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip comments
      if (line.startsWith('//') || line.startsWith('/*')) {
        continue;
      }
      
      const match = line.match(arrayAccessPattern);
      if (match) {
        const arrayName = match[1];
        const index = match[2];

        // Skip if it's a mapping (mappings don't need bounds checks in Solidity)
        if (this._isMapping(lines, arrayName)) {
          continue;
        }

        // Check if index is a variable (not a literal number)
        if (isNaN(index)) {
          // Check for bounds validation
          const hasBoundsCheck = this._checkForBoundsValidation(lines, i, arrayName, index);
          
          if (!hasBoundsCheck) {
            vulnerabilities.push({
              type: 'STATE_VALIDATION',
              title: 'Missing array bounds check',
              description: `Array access '${arrayName}[${index}]' without bounds validation.`,
              line: i + 1,
              code: line,
              recommendation: `Add require(${index} < ${arrayName}.length) before array access.`,
              references: [
                'https://docs.soliditylang.org/en/latest/types.html#arrays'
              ]
            });
          }
        }
      }
    }

    return vulnerabilities;
  }

  /**
   * Check if a variable is a mapping
   */
  _isMapping(lines, variableName) {
    for (const line of lines) {
      // Check for mapping declaration
      if (line.includes('mapping') && line.includes(variableName)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Extract parameters from function signature
   */
  _extractParameters(paramString) {
    if (!paramString || paramString.trim() === '') {
      return [];
    }
    return paramString.split(',').map(p => p.trim()).filter(p => p.length > 0);
  }

  /**
   * Check for zero address validation
   */
  _checkForZeroAddressValidation(lines, lineIndex, variable) {
    for (let i = Math.max(0, lineIndex - 5); i < lineIndex; i++) {
      const line = lines[i];
      if (line.includes(`${variable} != address(0)`) || 
          line.includes(`${variable} != address(0x0)`)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check for state validation before operation
   */
  _checkForStateValidation(lines, lineIndex) {
    for (let i = Math.max(0, lineIndex - 3); i < lineIndex; i++) {
      const line = lines[i];
      if (line.includes('require(') || line.includes('if (')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check for array bounds validation
   */
  _checkForBoundsValidation(lines, lineIndex, arrayName, index) {
    for (let i = Math.max(0, lineIndex - 5); i < lineIndex; i++) {
      const line = lines[i];
      if (line.includes(`${index} < ${arrayName}.length`) ||
          line.includes(`${arrayName}.length > ${index}`)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if function is view or pure
   */
  _isViewOrPure(line) {
    return line.includes('view') || line.includes('pure');
  }

  /**
   * Check if brace is a closing function brace
   */
  _isClosingBrace(lines, index) {
    const line = lines[index];
    const indent = line.search(/\S/);
    return indent <= 4;
  }
}

module.exports = StateValidationDetector;

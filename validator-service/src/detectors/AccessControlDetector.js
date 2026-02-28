/**
 * Detector for access control vulnerabilities
 * Checks for missing or improper access modifiers
 */
class AccessControlDetector {
  constructor() {
    this.name = 'AccessControlDetector';
    this.criticalFunctions = [
      'withdraw',
      'transfer',
      'mint',
      'burn',
      'pause',
      'unpause',
      'setOwner',
      'transferOwnership',
      'upgrade',
      'selfdestruct',
      'destroy'
    ];
  }

  /**
   * Detect access control issues
   */
  detect(sourceCode) {
    const vulnerabilities = [];
    const lines = sourceCode.split('\n');

    // Pattern 1: Public functions that should be restricted
    vulnerabilities.push(...this._detectUnrestrictedCriticalFunctions(lines));

    // Pattern 2: Missing access modifiers
    vulnerabilities.push(...this._detectMissingAccessModifiers(lines));

    // Pattern 3: Functions with state changes but no access control
    vulnerabilities.push(...this._detectUnprotectedStateChanges(lines));

    return vulnerabilities;
  }

  /**
   * Detect critical functions without proper access control
   */
  _detectUnrestrictedCriticalFunctions(lines) {
    const vulnerabilities = [];
    const accessModifiers = [
      'onlyOwner',
      'onlyRole',
      'onlyAdmin',
      'requiresAuth',
      'private',
      'internal'
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip comments
      if (line.startsWith('//') || line.startsWith('/*')) {
        continue;
      }

      // Check for critical function names
      for (const criticalFunc of this.criticalFunctions) {
        const functionPattern = new RegExp(`function\\s+${criticalFunc}\\s*\\(`);
        
        if (functionPattern.test(line)) {
          // Check if function has access control
          const hasAccessControl = accessModifiers.some(modifier => 
            line.includes(modifier) || this._checkModifierInPreviousLines(lines, i, modifier)
          );

          const isPublicOrExternal = line.includes('public') || line.includes('external');

          if (isPublicOrExternal && !hasAccessControl) {
            vulnerabilities.push({
              type: 'ACCESS_CONTROL',
              title: 'Unrestricted critical function',
              description: `Critical function '${criticalFunc}' is public/external without access control.`,
              line: i + 1,
              code: line,
              recommendation: `Add access control modifier (e.g., onlyOwner, onlyRole) to '${criticalFunc}' function.`,
              references: [
                'https://docs.openzeppelin.com/contracts/4.x/access-control'
              ]
            });
          }
        }
      }
    }

    return vulnerabilities;
  }

  /**
   * Detect functions missing visibility modifiers
   */
  _detectMissingAccessModifiers(lines) {
    const vulnerabilities = [];
    const visibilityModifiers = ['public', 'external', 'internal', 'private'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for function declaration
      if (line.startsWith('function') && !line.includes('constructor')) {
        // Check current line and next 10 lines for visibility modifier
        // (handles multi-line function signatures with many parameters)
        let hasVisibility = false;
        let foundOpeningBrace = false;
        
        for (let j = i; j < Math.min(i + 15, lines.length); j++) {
          const checkLine = lines[j].trim();
          
          // Check for visibility modifier
          if (visibilityModifiers.some(modifier => {
            // Match whole word to avoid false positives
            const regex = new RegExp(`\\b${modifier}\\b`);
            return regex.test(checkLine);
          })) {
            hasVisibility = true;
            break;
          }
          
          // Stop if we hit the opening brace
          if (checkLine.includes('{')) {
            foundOpeningBrace = true;
            break;
          }
        }

        if (!hasVisibility && foundOpeningBrace) {
          const functionNameMatch = line.match(/function\s+(\w+)/);
          const functionName = functionNameMatch ? functionNameMatch[1] : 'unknown';

          vulnerabilities.push({
            type: 'ACCESS_CONTROL',
            title: 'Missing visibility modifier',
            description: `Function '${functionName}' lacks explicit visibility modifier.`,
            line: i + 1,
            code: line,
            recommendation: 'Add explicit visibility modifier (public, external, internal, or private).',
            references: [
              'https://docs.soliditylang.org/en/latest/contracts.html#visibility-and-getters'
            ]
          });
        }
      }
    }

    return vulnerabilities;
  }

  /**
   * Detect state-changing functions without access control
   */
  _detectUnprotectedStateChanges(lines) {
    const vulnerabilities = [];
    const stateChangePatterns = [
      /\w+\s*=\s*[^=]/,
      /\.push\(/,
      /\.pop\(/,
      /delete\s+\w+/
    ];

    let inFunction = false;
    let functionName = '';
    let functionLine = 0;
    let isPublicOrExternal = false;
    let hasAccessControl = false;
    let hasStateChange = false;
    let functionDeclarationLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect function start
      if (line.startsWith('function')) {
        const functionMatch = line.match(/function\s+(\w+)/);
        if (functionMatch) {
          inFunction = true;
          functionName = functionMatch[1];
          functionLine = i + 1;
          functionDeclarationLines = [line];
          hasStateChange = false;
          
          // Check next few lines for modifiers
          isPublicOrExternal = false;
          hasAccessControl = false;
          
          for (let j = i; j < Math.min(i + 5, lines.length); j++) {
            const checkLine = lines[j].trim();
            functionDeclarationLines.push(checkLine);
            
            if (checkLine.includes('public') || checkLine.includes('external')) {
              isPublicOrExternal = true;
            }
            if (this._hasAccessControlModifier(checkLine)) {
              hasAccessControl = true;
            }
            if (checkLine.includes('{')) break;
          }
        }
      }

      // Check for state changes in function
      if (inFunction) {
        const hasChange = stateChangePatterns.some(pattern => pattern.test(line));
        if (hasChange) {
          hasStateChange = true;
        }
      }

      // Detect function end
      if (inFunction && line.includes('}') && this._isClosingBrace(lines, i)) {
        // Check if it's a view/pure function
        const isViewOrPure = functionDeclarationLines.some(l => 
          l.includes('view') || l.includes('pure')
        );
        
        if (isPublicOrExternal && hasStateChange && !hasAccessControl && !isViewOrPure) {
          // Check for inline validation (msg.sender checks)
          const hasInlineValidation = this._hasInlineValidation(lines, functionLine, i);
          
          if (!hasInlineValidation) {
            vulnerabilities.push({
              type: 'ACCESS_CONTROL',
              title: 'Unprotected state-changing function',
              description: `Public function '${functionName}' modifies state without access control.`,
              line: functionLine,
              code: lines[functionLine - 1].trim(),
              recommendation: 'Add access control if function should be restricted, or make internal/private.',
              references: [
                'https://consensys.github.io/smart-contract-best-practices/development-recommendations/solidity-specific/visibility/'
              ]
            });
          }
        }
        inFunction = false;
        functionDeclarationLines = [];
      }
    }

    return vulnerabilities;
  }

  /**
   * Check for inline validation (msg.sender checks, require, revert)
   */
  _hasInlineValidation(lines, startLine, endLine) {
    const validationPatterns = [
      /msg\.sender/,
      /require\s*\(/,
      /revert\s+/,
      /if\s*\([^)]*\)\s*revert/
    ];
    
    for (let i = startLine; i < endLine; i++) {
      const line = lines[i];
      if (validationPatterns.some(pattern => pattern.test(line))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if function has access control modifier
   */
  _hasAccessControlModifier(line) {
    const modifiers = ['onlyOwner', 'onlyRole', 'onlyAdmin', 'requiresAuth'];
    return modifiers.some(modifier => line.includes(modifier));
  }

  /**
   * Check modifier in previous lines (for multi-line function declarations)
   */
  _checkModifierInPreviousLines(lines, currentIndex, modifier) {
    for (let i = Math.max(0, currentIndex - 3); i < currentIndex; i++) {
      if (lines[i].includes(modifier)) {
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

module.exports = AccessControlDetector;

# Smart Contract Validator Service

A production-ready Node.js microservice for deterministic smart contract validation. Detects common vulnerabilities in Solidity smart contracts through static analysis.

## Features

### Vulnerability Detection

- **Reentrancy Patterns**: Detects external calls before state changes, missing reentrancy guards
- **Access Control Issues**: Identifies improper access modifiers, unrestricted critical functions
- **Arithmetic Vulnerabilities**: Finds unchecked operations, division before multiplication
- **State Validation**: Detects missing input validation, zero address checks, array bounds checks

### Classification System

- **Severity Levels**: HIGH, MEDIUM, LOW
- **Risk Scoring**: Weighted scoring system for overall risk assessment
- **Confidence Levels**: Detection confidence for each finding
- **Exploitability**: Assessment of how easily vulnerability can be exploited

### API Features

- RESTful API with JSON responses
- Input validation with Joi
- Comprehensive error handling
- Request logging
- Health check endpoint
- Service statistics

## Installation

```bash
cd validator-service
npm install
```

## Configuration

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=INFO
```

## Usage

### Start Server

```bash
# Development
npm run dev

# Production
npm start
```

### Run Tests

```bash
npm test
```

## API Endpoints

### 1. Analyze Contract

**POST** `/api/analyze-contract`

Analyze a smart contract for vulnerabilities.

**Request Body:**

```json
{
  "sourceCode": "contract MyContract { ... }",
  "contractName": "MyContract"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "contractName": "MyContract",
    "vulnerabilities": [
      {
        "type": "REENTRANCY",
        "severity": "HIGH",
        "title": "External call before state change",
        "description": "External call detected before state variable update...",
        "line": 15,
        "code": "msg.sender.call{value: amount}(\"\");",
        "recommendation": "Move state changes before external calls...",
        "impact": "Attackers can drain contract funds...",
        "exploitability": "HIGH",
        "confidence": "MEDIUM",
        "references": ["https://..."]
      }
    ],
    "summary": {
      "totalVulnerabilities": 3,
      "high": 1,
      "medium": 1,
      "low": 1,
      "riskScore": 16,
      "overallRisk": "HIGH"
    },
    "recommendations": [
      {
        "type": "REENTRANCY",
        "severity": "HIGH",
        "recommendation": "Add nonReentrant modifier...",
        "priority": 1
      }
    ],
    "metadata": {
      "timestamp": "2024-01-01T00:00:00.000Z",
      "detectors": ["ReentrancyDetector", "AccessControlDetector", ...],
      "linesOfCode": 150,
      "analysisTime": "45ms"
    }
  }
}
```

### 2. Get Vulnerability Types

**GET** `/api/vulnerability-types`

Get list of all vulnerability types detected by the service.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "type": "REENTRANCY",
      "severity": "HIGH",
      "description": "Potential reentrancy vulnerability detected",
      "patterns": [
        "External call before state change",
        "Missing reentrancy guard",
        "Unprotected external call"
      ]
    }
  ]
}
```

### 3. Get Statistics

**GET** `/api/stats`

Get service statistics.

**Response:**

```json
{
  "success": true,
  "data": {
    "totalAnalyses": 150,
    "vulnerabilitiesFound": 450,
    "averageVulnerabilitiesPerContract": "3.00",
    "uptime": "3600s",
    "startTime": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Health Check

**GET** `/health`

Check service health.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600.5,
  "service": "smart-contract-validator",
  "version": "1.0.0"
}
```

## Example Usage

### cURL

```bash
curl -X POST http://localhost:3000/api/analyze-contract \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCode": "function withdraw() public { msg.sender.call{value: 100}(\"\"); }",
    "contractName": "VulnerableContract"
  }'
```

### JavaScript (fetch)

```javascript
const response = await fetch('http://localhost:3000/api/analyze-contract', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sourceCode: contractCode,
    contractName: 'MyContract'
  })
});

const result = await response.json();
console.log(result.data.summary);
```

### Node.js (axios)

```javascript
const axios = require('axios');

const result = await axios.post('http://localhost:3000/api/analyze-contract', {
  sourceCode: contractCode,
  contractName: 'MyContract'
});

console.log(result.data.data.vulnerabilities);
```

## Architecture

```
validator-service/
├── src/
│   ├── index.js                    # Application entry point
│   ├── routes/
│   │   └── contractRoutes.js       # API routes
│   ├── controllers/
│   │   └── contractController.js   # Request handlers
│   ├── services/
│   │   └── ContractAnalyzer.js     # Main analyzer orchestrator
│   ├── detectors/
│   │   ├── ReentrancyDetector.js   # Reentrancy detection
│   │   ├── AccessControlDetector.js # Access control detection
│   │   ├── ArithmeticDetector.js   # Arithmetic vulnerability detection
│   │   └── StateValidationDetector.js # State validation detection
│   ├── middleware/
│   │   ├── validation.js           # Input validation
│   │   └── errorHandler.js         # Error handling
│   └── utils/
│       ├── classifier.js           # Vulnerability classification
│       └── logger.js               # Logging utility
├── tests/
│   ├── analyzer.test.js            # Analyzer tests
│   └── api.test.js                 # API tests
├── package.json
├── .env.example
└── README.md
```

## Detectors

### ReentrancyDetector

Detects reentrancy vulnerabilities:
- External calls before state changes
- Missing reentrancy guards
- Unprotected value transfers

### AccessControlDetector

Detects access control issues:
- Unrestricted critical functions
- Missing visibility modifiers
- Unprotected state-changing functions

### ArithmeticDetector

Detects arithmetic vulnerabilities:
- Unchecked arithmetic (Solidity < 0.8.0)
- Unchecked blocks (Solidity >= 0.8.0)
- Division before multiplication
- Modulo without zero check

### StateValidationDetector

Detects missing state validation:
- Zero address checks
- Input validation
- State checks before operations
- Array bounds checks

## Severity Classification

### HIGH
- Reentrancy vulnerabilities
- Access control issues
- Direct fund loss risks

### MEDIUM
- Arithmetic vulnerabilities
- State validation issues
- Potential for incorrect behavior

### LOW
- Unchecked return values
- Gas optimization opportunities
- Code quality issues

## Risk Scoring

Risk score calculation:
- HIGH vulnerability: 10 points
- MEDIUM vulnerability: 5 points
- LOW vulnerability: 1 point

Overall risk levels:
- **HIGH**: Contains HIGH severity vulnerabilities
- **MEDIUM**: Contains MEDIUM severity vulnerabilities (no HIGH)
- **LOW**: Contains only LOW severity vulnerabilities
- **NONE**: No vulnerabilities detected

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

## Limitations

This is a static analysis tool with the following limitations:

1. **False Positives**: May flag code that is actually safe
2. **False Negatives**: May miss complex vulnerabilities
3. **Context-Dependent**: Cannot understand full business logic
4. **Pattern-Based**: Relies on known vulnerability patterns
5. **No Runtime Analysis**: Cannot detect runtime-specific issues

## Best Practices

1. **Use as First Line of Defense**: Not a replacement for audits
2. **Review All Findings**: Understand each vulnerability
3. **Combine with Other Tools**: Use multiple analysis tools
4. **Manual Review**: Always perform manual code review
5. **Professional Audit**: Get professional audit for production contracts

## Performance

- Average analysis time: 50-200ms per contract
- Supports contracts up to 1MB
- Memory efficient pattern matching
- Deterministic results (same input = same output)

## Error Handling

The service provides detailed error messages:

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "sourceCode",
      "message": "Source code is required"
    }
  ]
}
```

## Logging

Logs include:
- Request/response logging (Morgan)
- Error logging
- Analysis statistics
- Performance metrics

Log levels: ERROR, WARN, INFO, DEBUG

## Security

- Input validation on all endpoints
- Request size limits (10MB)
- Helmet.js security headers
- CORS enabled
- No code execution (static analysis only)

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit pull request

## License

MIT

## Support

For issues or questions:
1. Check documentation
2. Review test files for examples
3. Check error messages
4. Review detector source code

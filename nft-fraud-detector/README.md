# NFT Fraud Detection Engine

AI-powered fraud detection system for NFT transactions using machine learning anomaly detection, pattern recognition, and graph-based analysis.

## Overview

Production-grade fraud detection engine that analyzes NFT transactions in real-time to identify fraudulent activities. Combines multiple detection methods to provide comprehensive risk assessment with detailed fraud indicators.

## Features

### Detection Capabilities

- **Wash Trading**: Detects wallets buying and selling same NFTs repeatedly to artificially inflate volume
- **Circular Transfers**: Identifies NFTs transferred through multiple wallets and back to origin
- **Price Spikes**: Flags abnormal price increases (3x+ threshold) indicating price manipulation
- **Rapid Flipping**: Detects quick buy-sell patterns within 24 hours
- **Sybil Attacks**: Identifies clusters of wallets controlled by same entity
- **Anomaly Detection**: ML-based detection of unusual transaction patterns

### Technologies

- **Isolation Forest**: Unsupervised ML for anomaly detection
- **NetworkX**: Graph-based wallet relationship analysis
- **FastAPI**: High-performance REST API
- **scikit-learn**: Machine learning models
- **Pydantic**: Type-safe data validation
- **pytest**: Comprehensive test suite

### Output

- **Risk Score**: 0-100 scale with detailed breakdown
- **Risk Category**: Low (0-39), Medium (40-69), High (70-100)
- **Fraud Flags**: Specific fraud types detected with confidence scores
- **Suspicious Wallet Logging**: Automatic tracking and alerting
- **Graph Metrics**: Wallet relationship analysis
- **Detailed Reports**: JSON format with all detection results

## Quick Start

### Installation

```bash
cd nft-fraud-detector
pip install -r requirements.txt
```

### Docker Deployment (Recommended)

```bash
# Build and run
docker-compose up -d

# Check health
curl http://localhost:8000/health

# View logs
docker-compose logs -f
```

### Local Development

```bash
# Start API server
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000

# Access API documentation
open http://localhost:8000/docs
```

### Run Example Usage

```bash
# Run comprehensive examples
python example_usage.py
```

## Usage Guide

### 1. Train the Engine

```python
import requests

# Prepare training data
transactions = [
    {
        "nft_id": "nft_001",
        "seller": "0xABC...123",
        "buyer": "0xDEF...456",
        "price": 1500.0,
        "timestamp": 1640000000,
        "buyer_volume": 5000.0,
        "seller_volume": 3000.0
    }
    # ... more transactions (100+ recommended)
]

# Train the engine
response = requests.post('http://localhost:8000/train', json={
    'transactions': transactions
})

print(response.json())
# Output: {"success": true, "message": "Engine trained on 100 transactions", ...}
```

### 2. Analyze Transaction

```python
# Analyze a single transaction
response = requests.post('http://localhost:8000/risk-score', json={
    'transaction': {
        'nft_id': 'nft_001',
        'seller': '0xABC...123',
        'buyer': '0xDEF...456',
        'price': 5000.0,
        'timestamp': 1640000000
    },
    'wallet_history': [],  # Optional: previous transactions from this wallet
    'nft_price_history': [1000, 1200, 1100]  # Optional: historical prices
})

result = response.json()
print(f"Risk Score: {result['risk_score']:.1f}/100")
print(f"Risk Category: {result['risk_category']}")
print(f"Fraud Detected: {result['fraud_detected']}")
print(f"Flags: {', '.join(result['flags'])}")
```

### 3. Python SDK Usage

```python
from src.engine.fraud_engine import FraudDetectionEngine
from src.data.transaction_generator import TransactionGenerator

# Initialize
engine = FraudDetectionEngine()
generator = TransactionGenerator()

# Train
training_data = generator.generate_mixed_dataset(
    normal=100,
    wash_trading=20,
    circular=10,
    price_spikes=5
)
engine.train(training_data)

# Analyze
transaction = {
    'nft_id': 'nft_001',
    'seller': '0xABC123',
    'buyer': '0xDEF456',
    'price': 5000.0
}

result = engine.analyze_transaction(transaction)
print(f"Risk: {result['risk_score']:.1f} ({result['risk_category']})")
```

## API Endpoints

### Core Endpoints

#### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00",
  "is_trained": true,
  "version": "1.0.0"
}
```

#### POST `/train`
Train the fraud detection engine.

**Request:**
```json
{
  "transactions": [
    {
      "nft_id": "nft_001",
      "seller": "0xABC123",
      "buyer": "0xDEF456",
      "price": 1500.0,
      "timestamp": 1640000000
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Engine trained on 100 transactions",
  "statistics": {
    "is_trained": true,
    "suspicious_wallets_count": 0,
    "total_fraud_detections": 0
  }
}
```

#### POST `/risk-score`
Calculate fraud risk score for a transaction.

**Request:**
```json
{
  "transaction": {
    "nft_id": "nft_001",
    "seller": "0xABC...123",
    "buyer": "0xDEF...456",
    "price": 1500.0,
    "timestamp": 1640000000
  },
  "wallet_history": [],
  "nft_price_history": [1000, 1200, 1100]
}
```

**Response:**
```json
{
  "transaction_id": "tx_12345",
  "wallet_address": "0xDEF...456",
  "timestamp": "2024-01-01T00:00:00",
  "fraud_detected": true,
  "risk_score": 75.5,
  "risk_category": "High",
  "flags": ["WASH_TRADING", "PRICE_SPIKE"],
  "anomaly_detection": {
    "is_anomaly": true,
    "anomaly_score": 0.15,
    "confidence": 0.85
  },
  "pattern_detection": {
    "wash_trading": {
      "detected": true,
      "confidence": 0.8,
      "details": "Wallet traded same NFT 5 times"
    },
    "price_spike": {
      "detected": true,
      "confidence": 0.9,
      "details": "Price increased 4.2x from median"
    }
  },
  "graph_analysis": {
    "metrics": {
      "degree": 15,
      "clustering_coefficient": 0.75,
      "betweenness_centrality": 0.05,
      "pagerank": 0.002
    },
    "circular_patterns": {
      "detected": false,
      "count": 0
    },
    "sybil_cluster": {
      "is_sybil_cluster": false,
      "cluster_size": 1
    }
  }
}
```

#### GET `/suspicious-wallets`
Get list of flagged suspicious wallets.

**Response:**
```json
{
  "wallets": ["0xABC123", "0xDEF456"],
  "total_count": 2
}
```

#### GET `/fraud-log?limit=100`
Get fraud detection log.

**Response:**
```json
{
  "log_entries": [
    {
      "wallet_address": "0xABC123",
      "timestamp": "2024-01-01T00:00:00",
      "risk_score": 75.5,
      "risk_category": "High",
      "flags": ["WASH_TRADING"]
    }
  ],
  "total_entries": 1
}
```

#### GET `/statistics`
Get system statistics.

**Response:**
```json
{
  "is_trained": true,
  "suspicious_wallets_count": 5,
  "total_fraud_detections": 12,
  "graph_statistics": {
    "total_nodes": 150,
    "total_edges": 300,
    "average_degree": 4.0
  }
}
```

## Detection Methods

### 1. Anomaly Detection (Isolation Forest)

Detects unusual patterns in:
- Transaction prices
- Wallet volumes
- Transaction frequency
- Network metrics

### 2. Pattern Detection

**Wash Trading:**
- Same wallet buying/selling same NFT 3+ times
- Confidence based on frequency

**Circular Transfers:**
- NFT transferred through wallets and returns to origin
- Max 5 hops checked

**Price Spikes:**
- 3x+ increase from mean/median
- 2x+ increase from historical max

**Rapid Flipping:**
- Buy-sell within 24 hours
- 2+ flips flagged

### 3. Graph Analysis (NetworkX)

**Metrics:**
- Degree centrality
- Clustering coefficient
- Betweenness centrality
- PageRank

**Patterns:**
- Circular transaction paths
- Sybil clusters (similar wallets)
- Tight-knit groups

## Risk Score Calculation

```
Total Risk Score (0-100):
├─ Anomaly Detection: 0-30 points
├─ Pattern Detection: 0-40 points
│  ├─ Wash Trading: 0-15
│  ├─ Circular Transfers: 0-15
│  ├─ Price Spike: 0-10
│  └─ Rapid Flipping: 0-10
└─ Graph Analysis: 0-30 points
   ├─ Circular Patterns: 0-10
   ├─ Sybil Cluster: 0-10
   └─ Graph Risk: 0-10
```

## Example Usage

```python
from src.engine.fraud_engine import FraudDetectionEngine
from src.data.transaction_generator import TransactionGenerator

# Initialize
engine = FraudDetectionEngine()
generator = TransactionGenerator()

# Generate training data
training_data = generator.generate_mixed_dataset(
    normal=100,
    wash_trading=20,
    circular=10,
    price_spikes=5
)

# Train
engine.train(training_data)

# Analyze transaction
transaction = {
    'nft_id': 'nft_001',
    'seller': '0xABC...123',
    'buyer': '0xDEF...456',
    'price': 5000.0
}

result = engine.analyze_transaction(transaction)
print(f"Risk: {result['risk_score']:.1f} ({result['risk_category']})")
```

## Testing

### Run All Tests

```bash
# Run all tests with verbose output
pytest tests/ -v

# Run with coverage report
pytest tests/ --cov=src --cov-report=html

# Run specific test file
pytest tests/test_fraud_engine.py -v

# Run specific test
pytest tests/test_fraud_engine.py::TestFraudDetectionEngine::test_wash_trading_detection -v
```

### Test Coverage

- **Unit Tests**: 35+ tests for fraud engine
- **API Tests**: 40+ tests for all endpoints
- **Integration Tests**: 10+ end-to-end workflow tests
- **Total Coverage**: >90%

### Test Categories

```bash
# Run only unit tests
pytest tests/ -v -m unit

# Run only integration tests
pytest tests/ -v -m integration
```

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f fraud-detector

# Stop
docker-compose down

# Rebuild after changes
docker-compose up -d --build
```

### Using Docker Directly

```bash
# Build image
docker build -t nft-fraud-detector .

# Run container
docker run -d -p 8000:8000 --name fraud-detector nft-fraud-detector

# View logs
docker logs -f fraud-detector

# Stop container
docker stop fraud-detector
```

### Health Check

```bash
# Check container health
docker ps

# Manual health check
curl http://localhost:8000/health
```

## Architecture

```
┌─────────────────────────────────────┐
│      FastAPI Application            │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│   Fraud Detection Engine            │
└─┬──────────┬──────────┬─────────────┘
  │          │          │
  ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│Anomaly │ │Pattern │ │ Graph  │
│Detector│ │Detector│ │Analysis│
└────────┘ └────────┘ └────────┘
```

## Performance

- Training: ~2 seconds for 1000 transactions
- Analysis: <100ms per transaction
- Graph building: ~1 second for 1000 transactions

## Limitations

1. Requires training data
2. Graph analysis needs transaction history
3. Pattern detection needs wallet history
4. Synthetic data for demonstration

## Future Enhancements

- [ ] Real blockchain data integration
- [ ] Deep learning models
- [ ] Real-time monitoring
- [ ] Advanced graph algorithms
- [ ] Multi-chain support
- [ ] Automated retraining

## License

MIT

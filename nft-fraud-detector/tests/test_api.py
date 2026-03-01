"""
Comprehensive tests for FastAPI endpoints
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.main import app
from src.data.transaction_generator import TransactionGenerator


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def transaction_generator():
    """Create transaction generator"""
    return TransactionGenerator()


@pytest.fixture
def sample_transaction():
    """Sample transaction data"""
    return {
        "transaction_id": "tx_001",
        "nft_id": "nft_001",
        "seller": "0xABC123",
        "buyer": "0xDEF456",
        "price": 1500.0,
        "timestamp": 1640000000,
        "buyer_volume": 5000.0,
        "seller_volume": 3000.0
    }


@pytest.fixture
def risk_score_request(sample_transaction):
    """Sample risk score request"""
    return {
        "transaction": sample_transaction,
        "wallet_history": [],
        "nft_price_history": []
    }


class TestRootEndpoints:
    """Test root and health endpoints"""
    
    def test_root_endpoint(self, client):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert "endpoints" in data
        assert data["version"] == "1.0.0"
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "is_trained" in data
        assert data["version"] == "1.0.0"


class TestRiskScoreEndpoint:
    """Test risk score calculation endpoint"""
    
    def test_risk_score_basic(self, client, risk_score_request):
        """Test basic risk score calculation"""
        response = client.post("/risk-score", json=risk_score_request)
        assert response.status_code == 200
        
        data = response.json()
        assert "risk_score" in data
        assert "risk_category" in data
        assert "fraud_detected" in data
        assert "flags" in data
        assert "anomaly_detection" in data
        assert "pattern_detection" in data
        assert "graph_analysis" in data
        
        # Validate risk score range
        assert 0 <= data["risk_score"] <= 100
        assert data["risk_category"] in ["Low", "Medium", "High"]
    
    def test_risk_score_with_history(self, client, sample_transaction):
        """Test risk score with wallet history"""
        wallet_history = [
            sample_transaction.copy(),
            {**sample_transaction, "transaction_id": "tx_002", "price": 1600.0},
            {**sample_transaction, "transaction_id": "tx_003", "price": 1550.0}
        ]
        
        request = {
            "transaction": sample_transaction,
            "wallet_history": wallet_history,
            "nft_price_history": [1000, 1200, 1400]
        }
        
        response = client.post("/risk-score", json=request)
        assert response.status_code == 200
        
        data = response.json()
        assert "pattern_detection" in data
    
    def test_risk_score_with_price_history(self, client, sample_transaction):
        """Test risk score with price history"""
        request = {
            "transaction": sample_transaction,
            "wallet_history": [],
            "nft_price_history": [1000, 1100, 1050, 1200, 1150]
        }
        
        response = client.post("/risk-score", json=request)
        assert response.status_code == 200
        
        data = response.json()
        assert "risk_score" in data
    
    def test_risk_score_invalid_transaction(self, client):
        """Test risk score with invalid transaction"""
        invalid_request = {
            "transaction": {
                "nft_id": "nft_001",
                # Missing required fields
            }
        }
        
        response = client.post("/risk-score", json=invalid_request)
        # Should handle gracefully or return 422
        assert response.status_code in [200, 422, 500]
    
    def test_risk_score_missing_fields(self, client):
        """Test risk score with missing request fields"""
        response = client.post("/risk-score", json={})
        assert response.status_code == 422  # Validation error
    
    def test_risk_score_negative_price(self, client, sample_transaction):
        """Test risk score with negative price"""
        invalid_tx = sample_transaction.copy()
        invalid_tx["price"] = -1000
        
        request = {
            "transaction": invalid_tx
        }
        
        response = client.post("/risk-score", json=request)
        assert response.status_code == 422  # Validation error


class TestTrainingEndpoint:
    """Test training endpoint"""
    
    def test_train_engine(self, client, transaction_generator):
        """Test training the engine"""
        training_data = transaction_generator.generate_normal_transactions(50)
        
        request = {
            "transactions": training_data
        }
        
        response = client.post("/train", json=request)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "message" in data
        assert "statistics" in data
        assert data["statistics"]["is_trained"] is True
    
    def test_train_with_mixed_data(self, client, transaction_generator):
        """Test training with mixed fraud scenarios"""
        training_data = transaction_generator.generate_mixed_dataset(
            normal=30,
            wash_trading=10,
            circular=5,
            price_spikes=5
        )
        
        request = {
            "transactions": training_data
        }
        
        response = client.post("/train", json=request)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
    
    def test_train_empty_data(self, client):
        """Test training with empty data"""
        request = {
            "transactions": []
        }
        
        response = client.post("/train", json=request)
        # Should handle gracefully
        assert response.status_code in [200, 422, 500]
    
    def test_train_invalid_data(self, client):
        """Test training with invalid data"""
        request = {
            "transactions": [{"invalid": "data"}]
        }
        
        response = client.post("/train", json=request)
        assert response.status_code in [422, 500]


class TestSuspiciousWalletsEndpoint:
    """Test suspicious wallets endpoint"""
    
    def test_get_suspicious_wallets_empty(self, client):
        """Test getting suspicious wallets when none exist"""
        response = client.get("/suspicious-wallets")
        assert response.status_code == 200
        
        data = response.json()
        assert "wallets" in data
        assert "total_count" in data
        assert isinstance(data["wallets"], list)
        assert data["total_count"] == len(data["wallets"])
    
    def test_get_suspicious_wallets_after_detection(
        self, client, transaction_generator
    ):
        """Test getting suspicious wallets after fraud detection"""
        # Train engine
        training_data = transaction_generator.generate_mixed_dataset(
            normal=50, wash_trading=10
        )
        client.post("/train", json={"transactions": training_data})
        
        # Analyze fraudulent transactions
        fraud_txs = transaction_generator.generate_wash_trading_transactions(5)
        for tx in fraud_txs:
            request = {
                "transaction": tx,
                "wallet_history": fraud_txs
            }
            client.post("/risk-score", json=request)
        
        # Get suspicious wallets
        response = client.get("/suspicious-wallets")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data["wallets"], list)


class TestFraudLogEndpoint:
    """Test fraud log endpoint"""
    
    def test_get_fraud_log_default(self, client):
        """Test getting fraud log with default limit"""
        response = client.get("/fraud-log")
        assert response.status_code == 200
        
        data = response.json()
        assert "log_entries" in data
        assert "total_entries" in data
        assert isinstance(data["log_entries"], list)
    
    def test_get_fraud_log_with_limit(self, client):
        """Test getting fraud log with custom limit"""
        response = client.get("/fraud-log?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["log_entries"]) <= 10
    
    def test_get_fraud_log_after_detections(
        self, client, transaction_generator
    ):
        """Test fraud log after multiple detections"""
        # Train and analyze
        training_data = transaction_generator.generate_normal_transactions(30)
        client.post("/train", json={"transactions": training_data})
        
        # Analyze transactions
        test_txs = transaction_generator.generate_wash_trading_transactions(3)
        for tx in test_txs:
            request = {"transaction": tx, "wallet_history": test_txs}
            client.post("/risk-score", json=request)
        
        # Get log
        response = client.get("/fraud-log")
        assert response.status_code == 200


class TestStatisticsEndpoint:
    """Test statistics endpoint"""
    
    def test_get_statistics_untrained(self, client):
        """Test statistics before training"""
        response = client.get("/statistics")
        assert response.status_code == 200
        
        data = response.json()
        assert "is_trained" in data
        assert "suspicious_wallets_count" in data
        assert "total_fraud_detections" in data
        assert "graph_statistics" in data
    
    def test_get_statistics_trained(self, client, transaction_generator):
        """Test statistics after training"""
        # Train engine
        training_data = transaction_generator.generate_normal_transactions(50)
        client.post("/train", json={"transactions": training_data})
        
        # Get statistics
        response = client.get("/statistics")
        assert response.status_code == 200
        
        data = response.json()
        assert data["is_trained"] is True
        assert isinstance(data["suspicious_wallets_count"], int)
        assert isinstance(data["total_fraud_detections"], int)


class TestIntegrationWorkflow:
    """Integration tests for complete workflows"""
    
    def test_complete_fraud_detection_workflow(
        self, client, transaction_generator
    ):
        """Test complete fraud detection workflow"""
        # 1. Check health
        health_response = client.get("/health")
        assert health_response.status_code == 200
        
        # 2. Train engine
        training_data = transaction_generator.generate_mixed_dataset(
            normal=100, wash_trading=20, circular=10
        )
        train_response = client.post("/train", json={"transactions": training_data})
        assert train_response.status_code == 200
        
        # 3. Analyze transactions
        test_txs = transaction_generator.generate_wash_trading_transactions(5)
        for tx in test_txs:
            request = {"transaction": tx, "wallet_history": test_txs}
            risk_response = client.post("/risk-score", json=request)
            assert risk_response.status_code == 200
        
        # 4. Check suspicious wallets
        wallets_response = client.get("/suspicious-wallets")
        assert wallets_response.status_code == 200
        
        # 5. Check fraud log
        log_response = client.get("/fraud-log")
        assert log_response.status_code == 200
        
        # 6. Check statistics
        stats_response = client.get("/statistics")
        assert stats_response.status_code == 200
        stats_data = stats_response.json()
        assert stats_data["is_trained"] is True
    
    def test_multiple_fraud_types_detection(
        self, client, transaction_generator
    ):
        """Test detection of multiple fraud types"""
        # Train
        training_data = transaction_generator.generate_normal_transactions(50)
        client.post("/train", json={"transactions": training_data})
        
        # Test wash trading
        wash_txs = transaction_generator.generate_wash_trading_transactions(3)
        wash_request = {
            "transaction": wash_txs[-1],
            "wallet_history": wash_txs
        }
        wash_response = client.post("/risk-score", json=wash_request)
        assert wash_response.status_code == 200
        
        # Test circular transfers
        circular_txs = transaction_generator.generate_circular_transfer_transactions(3)
        circular_request = {
            "transaction": circular_txs[-1],
            "wallet_history": circular_txs
        }
        circular_response = client.post("/risk-score", json=circular_request)
        assert circular_response.status_code == 200
        
        # Test price spike
        normal_tx = transaction_generator.generate_normal_transactions(1)[0]
        spike_tx = normal_tx.copy()
        spike_tx["price"] = 10000
        spike_request = {
            "transaction": spike_tx,
            "nft_price_history": [1000, 1100, 1050]
        }
        spike_response = client.post("/risk-score", json=spike_request)
        assert spike_response.status_code == 200


class TestErrorHandling:
    """Test error handling"""
    
    def test_invalid_endpoint(self, client):
        """Test invalid endpoint"""
        response = client.get("/invalid-endpoint")
        assert response.status_code == 404
    
    def test_invalid_method(self, client):
        """Test invalid HTTP method"""
        response = client.get("/train")  # Should be POST
        assert response.status_code == 405
    
    def test_malformed_json(self, client):
        """Test malformed JSON"""
        response = client.post(
            "/risk-score",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

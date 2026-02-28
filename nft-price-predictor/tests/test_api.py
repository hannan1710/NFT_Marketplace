"""
Tests for FastAPI endpoints
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.api.main import app

client = TestClient(app)


class TestAPIEndpoints:
    """Test API endpoints"""
    
    def test_root_endpoint(self):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert "endpoints" in data
    
    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "models_loaded" in data
        assert "version" in data
    
    def test_models_endpoint(self):
        """Test models info endpoint"""
        response = client.get("/models")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
    
    def test_specific_model_endpoint(self):
        """Test specific model info endpoint"""
        response = client.get("/models/random_forest")
        assert response.status_code == 200
        data = response.json()
        assert data["model_type"] == "random_forest"
        assert "is_loaded" in data
    
    def test_invalid_model_type_endpoint(self):
        """Test invalid model type"""
        response = client.get("/models/invalid_model")
        assert response.status_code == 400
    
    def test_predict_endpoint_structure(self):
        """Test predict endpoint structure (may fail if models not trained)"""
        payload = {
            "features": {
                "rarity_score": 85.5,
                "creator_transaction_volume": 150.0,
                "demand_index": 7.5,
                "historical_price_trend": 2.3
            },
            "model_type": "random_forest"
        }
        
        response = client.post("/predict", json=payload)
        # May be 503 if models not loaded, or 200 if loaded
        assert response.status_code in [200, 503]
    
    def test_predict_invalid_features(self):
        """Test predict with invalid features"""
        payload = {
            "features": {
                "rarity_score": 150.0,  # Invalid: > 100
                "creator_transaction_volume": 150.0,
                "demand_index": 7.5,
                "historical_price_trend": 2.3
            }
        }
        
        response = client.post("/predict", json=payload)
        assert response.status_code == 422  # Validation error
    
    def test_predict_missing_features(self):
        """Test predict with missing features"""
        payload = {
            "features": {
                "rarity_score": 85.5,
                "creator_transaction_volume": 150.0
                # Missing demand_index and historical_price_trend
            }
        }
        
        response = client.post("/predict", json=payload)
        assert response.status_code == 422  # Validation error
    
    def test_batch_predict_endpoint_structure(self):
        """Test batch predict endpoint structure"""
        payload = {
            "features_list": [
                {
                    "rarity_score": 85.5,
                    "creator_transaction_volume": 150.0,
                    "demand_index": 7.5,
                    "historical_price_trend": 2.3
                },
                {
                    "rarity_score": 60.0,
                    "creator_transaction_volume": 80.0,
                    "demand_index": 5.0,
                    "historical_price_trend": 1.0
                }
            ],
            "model_type": "random_forest"
        }
        
        response = client.post("/batch-predict", json=payload)
        # May be 503 if models not loaded, or 200 if loaded
        assert response.status_code in [200, 503]
    
    def test_batch_predict_too_many_items(self):
        """Test batch predict with too many items"""
        payload = {
            "features_list": [
                {
                    "rarity_score": 85.5,
                    "creator_transaction_volume": 150.0,
                    "demand_index": 7.5,
                    "historical_price_trend": 2.3
                }
            ] * 101,  # 101 items (max is 100)
            "model_type": "random_forest"
        }
        
        response = client.post("/batch-predict", json=payload)
        assert response.status_code == 422  # Validation error

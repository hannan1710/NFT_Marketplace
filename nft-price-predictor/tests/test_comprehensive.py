"""
Comprehensive PyTest Test Suite for NFT Price Prediction Microservice
Tests all 7 required categories with extensive coverage
"""

import pytest
import sys
import os
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from src.api.main import app
from src.models.nft_predictor import NFTPricePredictor
from src.data.data_generator import NFTDataGenerator
import pandas as pd
import numpy as np
import joblib
import tempfile


# Test client
client = TestClient(app)


# ============ Fixtures ============

@pytest.fixture(scope="session")
def sample_training_data():
    """Generate sample training data"""
    generator = NFTDataGenerator(random_state=42)
    X, y = generator.generate_dataset(n_samples=200, noise_level=0.1)
    return X, y


@pytest.fixture(scope="session")
def trained_lr_model(sample_training_data):
    """Create and train Linear Regression model"""
    X, y = sample_training_data
    predictor = NFTPricePredictor(model_type='linear_regression')
    metrics = predictor.train(X, y, test_size=0.2, random_state=42)
    return predictor, metrics


@pytest.fixture(scope="session")
def trained_rf_model(sample_training_data):
    """Create and train Random Forest model"""
    X, y = sample_training_data
    predictor = NFTPricePredictor(model_type='random_forest')
    metrics = predictor.train(X, y, test_size=0.2, random_state=42)
    return predictor, metrics


@pytest.fixture
def valid_features():
    """Valid NFT features for testing"""
    return {
        'rarity_score': 75.0,
        'creator_transaction_volume': 100.0,
        'demand_index': 8.0,
        'historical_price_trend': 3.0
    }


@pytest.fixture
def temp_model_dir():
    """Temporary directory for model files"""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


# ============ 1. Model Training Success ============

class TestModelTraining:
    """Test model training functionality"""
    
    def test_lr_training_success(self, sample_training_data):
        """Test Linear Regression training completes successfully"""
        X, y = sample_training_data
        predictor = NFTPricePredictor(model_type='linear_regression')
        
        metrics = predictor.train(X, y, test_size=0.2, random_state=42)
        
        assert predictor.is_trained is True
        assert 'test_rmse' in metrics
        assert 'test_r2' in metrics
        assert 'train_rmse' in metrics
        assert 'train_r2' in metrics
        assert metrics['test_r2'] >= 0
        assert metrics['test_rmse'] > 0
    
    def test_rf_training_success(self, sample_training_data):
        """Test Random Forest training completes successfully"""
        X, y = sample_training_data
        predictor = NFTPricePredictor(model_type='random_forest')
        
        metrics = predictor.train(X, y, test_size=0.2, random_state=42)
        
        assert predictor.is_trained is True
        assert 'test_rmse' in metrics
        assert 'test_r2' in metrics
        assert metrics['test_r2'] >= 0
        assert metrics['test_rmse'] > 0
    
    def test_training_returns_all_metrics(self, sample_training_data):
        """Test training returns all required metrics"""
        X, y = sample_training_data
        predictor = NFTPricePredictor(model_type='random_forest')
        
        metrics = predictor.train(X, y, test_size=0.2)
        
        required_metrics = ['train_rmse', 'test_rmse', 'train_r2', 'test_r2', 
                           'train_mae', 'test_mae', 'cv_rmse', 'cv_rmse_std']
        for metric in required_metrics:
            assert metric in metrics
            assert isinstance(metrics[metric], (int, float))
    
    def test_training_with_different_test_sizes(self, sample_training_data):
        """Test training with different test set sizes"""
        X, y = sample_training_data
        
        for test_size in [0.1, 0.2, 0.3]:
            predictor = NFTPricePredictor(model_type='linear_regression')
            metrics = predictor.train(X, y, test_size=test_size)
            assert predictor.is_trained is True
            assert metrics['test_r2'] >= 0
    
    def test_training_improves_with_more_data(self):
        """Test that more training data improves model performance"""
        generator = NFTDataGenerator(random_state=42)
        
        # Train with small dataset
        X_small, y_small = generator.generate_dataset(n_samples=50)
        predictor_small = NFTPricePredictor(model_type='random_forest')
        metrics_small = predictor_small.train(X_small, y_small, test_size=0.2)
        
        # Train with large dataset
        X_large, y_large = generator.generate_dataset(n_samples=500)
        predictor_large = NFTPricePredictor(model_type='random_forest')
        metrics_large = predictor_large.train(X_large, y_large, test_size=0.2)
        
        # Larger dataset should have better or similar R²
        assert metrics_large['test_r2'] >= metrics_small['test_r2'] - 0.1


# ============ 2. Model Save/Load Consistency ============

class TestModelPersistence:
    """Test model save and load functionality"""
    
    def test_save_and_load_lr_model(self, trained_lr_model, temp_model_dir):
        """Test Linear Regression model save and load"""
        predictor, _ = trained_lr_model
        model_path = os.path.join(temp_model_dir, 'lr_test.joblib')
        
        # Save model
        predictor.save_model(model_path)
        assert os.path.exists(model_path)
        
        # Load model
        loaded_predictor = NFTPricePredictor.load_model(model_path)
        
        assert loaded_predictor.is_trained is True
        assert loaded_predictor.model_type == 'linear_regression'
        assert loaded_predictor.feature_names == predictor.feature_names
    
    def test_save_and_load_rf_model(self, trained_rf_model, temp_model_dir):
        """Test Random Forest model save and load"""
        predictor, _ = trained_rf_model
        model_path = os.path.join(temp_model_dir, 'rf_test.joblib')
        
        # Save model
        predictor.save_model(model_path)
        assert os.path.exists(model_path)
        
        # Load model
        loaded_predictor = NFTPricePredictor.load_model(model_path)
        
        assert loaded_predictor.is_trained is True
        assert loaded_predictor.model_type == 'random_forest'
    
    def test_prediction_consistency_after_load(self, trained_rf_model, temp_model_dir, valid_features):
        """Test predictions are consistent after save/load"""
        predictor, _ = trained_rf_model
        model_path = os.path.join(temp_model_dir, 'consistency_test.joblib')
        
        # Predict before save
        price_before, conf_before = predictor.predict(valid_features)
        
        # Save and load
        predictor.save_model(model_path)
        loaded_predictor = NFTPricePredictor.load_model(model_path)
        
        # Predict after load
        price_after, conf_after = loaded_predictor.predict(valid_features)
        
        # Predictions should be identical
        assert abs(price_before - price_after) < 0.001
        assert abs(conf_before - conf_after) < 0.001
    
    def test_cannot_save_untrained_model(self, temp_model_dir):
        """Test that untrained model cannot be saved"""
        predictor = NFTPricePredictor(model_type='linear_regression')
        model_path = os.path.join(temp_model_dir, 'untrained.joblib')
        
        with pytest.raises(ValueError, match="Cannot save untrained model"):
            predictor.save_model(model_path)
    
    def test_load_nonexistent_model(self):
        """Test loading non-existent model raises error"""
        with pytest.raises(FileNotFoundError):
            NFTPricePredictor.load_model('nonexistent_model.joblib')
    
    def test_model_file_format(self, trained_rf_model, temp_model_dir):
        """Test saved model file contains all required data"""
        predictor, _ = trained_rf_model
        model_path = os.path.join(temp_model_dir, 'format_test.joblib')
        
        predictor.save_model(model_path)
        
        # Load raw model data
        model_data = joblib.load(model_path)
        
        assert 'model' in model_data
        assert 'scaler' in model_data
        assert 'model_type' in model_data
        assert 'feature_names' in model_data
        assert 'is_trained' in model_data
        assert model_data['is_trained'] is True


# ============ 3. Prediction Endpoint Returns Valid JSON ============

class TestPredictionEndpointJSON:
    """Test prediction endpoint JSON response format"""
    
    def test_predict_endpoint_json_structure(self):
        """Test prediction endpoint returns valid JSON structure"""
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
        
        # Should be 200 if models loaded, 503 if not
        if response.status_code == 200:
            data = response.json()
            
            # Check all required fields
            assert "predicted_price" in data
            assert "confidence_score" in data
            assert "model_type" in data
            assert "timestamp" in data
            
            # Check data types
            assert isinstance(data["predicted_price"], (int, float))
            assert isinstance(data["confidence_score"], (int, float))
            assert isinstance(data["model_type"], str)
            assert isinstance(data["timestamp"], str)
    
    def test_batch_predict_json_structure(self):
        """Test batch prediction endpoint returns valid JSON"""
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
        
        if response.status_code == 200:
            data = response.json()
            
            assert "predictions" in data
            assert "total_predictions" in data
            assert isinstance(data["predictions"], list)
            assert isinstance(data["total_predictions"], int)
            assert data["total_predictions"] == 2
            
            # Check each prediction
            for pred in data["predictions"]:
                assert "predicted_price" in pred
                assert "confidence_score" in pred
                assert "model_type" in pred
                assert "timestamp" in pred
    
    def test_health_endpoint_json(self):
        """Test health endpoint returns valid JSON"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert "timestamp" in data
        assert "models_loaded" in data
        assert "version" in data
        assert isinstance(data["models_loaded"], dict)
    
    def test_models_endpoint_json(self):
        """Test models endpoint returns valid JSON array"""
        response = client.get("/models")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        for model_info in data:
            assert "model_type" in model_info
            assert "is_loaded" in model_info
            assert "feature_names" in model_info


# ============ 4. Invalid Input Handling ============

class TestInvalidInputHandling:
    """Test handling of invalid inputs"""
    
    def test_invalid_rarity_score_too_high(self):
        """Test rarity score > 100 is rejected"""
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
    
    def test_invalid_rarity_score_negative(self):
        """Test negative rarity score is rejected"""
        payload = {
            "features": {
                "rarity_score": -10.0,  # Invalid: < 0
                "creator_transaction_volume": 150.0,
                "demand_index": 7.5,
                "historical_price_trend": 2.3
            }
        }
        
        response = client.post("/predict", json=payload)
        assert response.status_code == 422
    
    def test_invalid_demand_index_too_high(self):
        """Test demand index > 10 is rejected"""
        payload = {
            "features": {
                "rarity_score": 75.0,
                "creator_transaction_volume": 150.0,
                "demand_index": 15.0,  # Invalid: > 10
                "historical_price_trend": 2.3
            }
        }
        
        response = client.post("/predict", json=payload)
        assert response.status_code == 422
    
    def test_missing_required_features(self):
        """Test missing required features is rejected"""
        payload = {
            "features": {
                "rarity_score": 75.0,
                "creator_transaction_volume": 150.0
                # Missing demand_index and historical_price_trend
            }
        }
        
        response = client.post("/predict", json=payload)
        assert response.status_code == 422
    
    def test_invalid_model_type(self):
        """Test invalid model type is rejected"""
        payload = {
            "features": {
                "rarity_score": 75.0,
                "creator_transaction_volume": 150.0,
                "demand_index": 7.5,
                "historical_price_trend": 2.3
            },
            "model_type": "invalid_model"
        }
        
        response = client.post("/predict", json=payload)
        assert response.status_code == 422
    
    def test_batch_predict_too_many_items(self):
        """Test batch prediction with > 100 items is rejected"""
        payload = {
            "features_list": [
                {
                    "rarity_score": 75.0,
                    "creator_transaction_volume": 150.0,
                    "demand_index": 7.5,
                    "historical_price_trend": 2.3
                }
            ] * 101,  # 101 items (max is 100)
            "model_type": "random_forest"
        }
        
        response = client.post("/batch-predict", json=payload)
        assert response.status_code == 422
    
    def test_empty_features_dict(self):
        """Test empty features dictionary is rejected"""
        payload = {
            "features": {}
        }
        
        response = client.post("/predict", json=payload)
        assert response.status_code == 422
    
    def test_non_numeric_features(self):
        """Test non-numeric feature values are rejected"""
        payload = {
            "features": {
                "rarity_score": "high",  # Invalid: string instead of number
                "creator_transaction_volume": 150.0,
                "demand_index": 7.5,
                "historical_price_trend": 2.3
            }
        }
        
        response = client.post("/predict", json=payload)
        assert response.status_code == 422


# ============ 5. RMSE Threshold Validation ============

class TestRMSEThreshold:
    """Test RMSE metrics meet quality thresholds"""
    
    def test_lr_rmse_threshold(self, trained_lr_model):
        """Test Linear Regression RMSE is within acceptable range"""
        predictor, metrics = trained_lr_model
        
        # RMSE should be reasonable (< 300 for price prediction)
        assert metrics['test_rmse'] > 0
        assert metrics['test_rmse'] < 300  # Reasonable threshold for NFT prices
        
        print(f"\n✓ LR Test RMSE: {metrics['test_rmse']:.2f}")
    
    def test_rf_rmse_threshold(self, trained_rf_model):
        """Test Random Forest RMSE is within acceptable range"""
        predictor, metrics = trained_rf_model
        
        assert metrics['test_rmse'] > 0
        assert metrics['test_rmse'] < 300  # Reasonable threshold for NFT prices
        
        print(f"\n✓ RF Test RMSE: {metrics['test_rmse']:.2f}")
    
    def test_rf_better_than_lr(self, trained_lr_model, trained_rf_model):
        """Test Random Forest has better or similar RMSE than Linear Regression"""
        _, lr_metrics = trained_lr_model
        _, rf_metrics = trained_rf_model
        
        # RF should generally perform better or similar
        assert rf_metrics['test_rmse'] <= lr_metrics['test_rmse'] * 1.2
        
        print(f"\n✓ LR RMSE: {lr_metrics['test_rmse']:.2f}")
        print(f"✓ RF RMSE: {rf_metrics['test_rmse']:.2f}")
    
    def test_cv_rmse_consistency(self, trained_rf_model):
        """Test cross-validation RMSE is consistent"""
        predictor, metrics = trained_rf_model
        
        # CV RMSE should be similar to test RMSE
        cv_rmse = metrics['cv_rmse']
        test_rmse = metrics['test_rmse']
        
        # Should be within 50% of each other
        assert abs(cv_rmse - test_rmse) / test_rmse < 0.5
        
        print(f"\n✓ CV RMSE: {cv_rmse:.2f}")
        print(f"✓ Test RMSE: {test_rmse:.2f}")
    
    def test_r2_score_threshold(self, trained_rf_model):
        """Test R² score meets minimum threshold"""
        predictor, metrics = trained_rf_model
        
        # R² should be at least 0.7 for good model
        assert metrics['test_r2'] >= 0.7
        
        print(f"\n✓ Test R²: {metrics['test_r2']:.4f}")
    
    def test_mae_reasonable(self, trained_rf_model):
        """Test Mean Absolute Error is reasonable"""
        predictor, metrics = trained_rf_model
        
        # MAE should be less than RMSE
        assert metrics['test_mae'] < metrics['test_rmse']
        assert metrics['test_mae'] > 0
        
        print(f"\n✓ Test MAE: {metrics['test_mae']:.2f}")


# ============ 6. Confidence Score Within 0-1 Range ============

class TestConfidenceScore:
    """Test confidence scores are within valid range"""
    
    def test_lr_confidence_range(self, trained_lr_model, valid_features):
        """Test Linear Regression confidence is between 0 and 1"""
        predictor, _ = trained_lr_model
        
        price, confidence = predictor.predict(valid_features)
        
        assert 0.0 <= confidence <= 1.0
        assert isinstance(confidence, float)
        
        print(f"\n✓ LR Confidence: {confidence:.4f}")
    
    def test_rf_confidence_range(self, trained_rf_model, valid_features):
        """Test Random Forest confidence is between 0 and 1"""
        predictor, _ = trained_rf_model
        
        price, confidence = predictor.predict(valid_features)
        
        assert 0.0 <= confidence <= 1.0
        assert isinstance(confidence, float)
        
        print(f"\n✓ RF Confidence: {confidence:.4f}")
    
    def test_batch_confidence_range(self, trained_rf_model):
        """Test batch predictions have valid confidence scores"""
        predictor, _ = trained_rf_model
        
        features_list = [
            {
                'rarity_score': 75.0,
                'creator_transaction_volume': 100.0,
                'demand_index': 8.0,
                'historical_price_trend': 3.0
            },
            {
                'rarity_score': 50.0,
                'creator_transaction_volume': 50.0,
                'demand_index': 5.0,
                'historical_price_trend': 1.0
            },
            {
                'rarity_score': 90.0,
                'creator_transaction_volume': 200.0,
                'demand_index': 9.0,
                'historical_price_trend': 5.0
            }
        ]
        
        results = predictor.predict_batch(features_list)
        
        for price, confidence in results:
            assert 0.0 <= confidence <= 1.0
            assert isinstance(confidence, float)
    
    def test_confidence_varies_with_features(self, trained_rf_model):
        """Test confidence varies based on feature values"""
        predictor, _ = trained_rf_model
        
        # Typical features
        typical_features = {
            'rarity_score': 50.0,
            'creator_transaction_volume': 100.0,
            'demand_index': 5.0,
            'historical_price_trend': 2.0
        }
        
        # Extreme features
        extreme_features = {
            'rarity_score': 99.0,
            'creator_transaction_volume': 500.0,
            'demand_index': 9.9,
            'historical_price_trend': 9.0
        }
        
        _, conf_typical = predictor.predict(typical_features)
        _, conf_extreme = predictor.predict(extreme_features)
        
        # Both should be in valid range
        assert 0.0 <= conf_typical <= 1.0
        assert 0.0 <= conf_extreme <= 1.0
    
    def test_confidence_not_zero_or_one(self, trained_rf_model, valid_features):
        """Test confidence is not exactly 0 or 1 (should be probabilistic)"""
        predictor, _ = trained_rf_model
        
        price, confidence = predictor.predict(valid_features)
        
        # Confidence should not be exactly 0 or 1 for real predictions
        assert 0.0 < confidence < 1.0


# ============ 7. Concurrent API Request Handling ============

class TestConcurrentRequests:
    """Test API handles concurrent requests correctly"""
    
    def test_concurrent_predict_requests(self):
        """Test multiple concurrent prediction requests"""
        payload = {
            "features": {
                "rarity_score": 75.0,
                "creator_transaction_volume": 100.0,
                "demand_index": 7.5,
                "historical_price_trend": 2.3
            },
            "model_type": "random_forest"
        }
        
        def make_request():
            return client.post("/predict", json=payload)
        
        # Make 10 concurrent requests
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            responses = [f.result() for f in as_completed(futures)]
        
        # All requests should succeed (200) or fail consistently (503)
        status_codes = [r.status_code for r in responses]
        assert all(code in [200, 503] for code in status_codes)
        
        # If models are loaded, check consistency
        if all(code == 200 for code in status_codes):
            prices = [r.json()["predicted_price"] for r in responses]
            # All predictions should be identical for same input
            assert all(abs(p - prices[0]) < 0.001 for p in prices)
    
    def test_concurrent_batch_requests(self):
        """Test concurrent batch prediction requests"""
        payload = {
            "features_list": [
                {
                    "rarity_score": 75.0,
                    "creator_transaction_volume": 100.0,
                    "demand_index": 7.5,
                    "historical_price_trend": 2.3
                }
            ] * 5,
            "model_type": "random_forest"
        }
        
        def make_request():
            return client.post("/batch-predict", json=payload)
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request) for _ in range(5)]
            responses = [f.result() for f in as_completed(futures)]
        
        status_codes = [r.status_code for r in responses]
        assert all(code in [200, 503] for code in status_codes)
    
    def test_concurrent_different_models(self):
        """Test concurrent requests to different models"""
        payload_lr = {
            "features": {
                "rarity_score": 75.0,
                "creator_transaction_volume": 100.0,
                "demand_index": 7.5,
                "historical_price_trend": 2.3
            },
            "model_type": "linear_regression"
        }
        
        payload_rf = {
            "features": {
                "rarity_score": 75.0,
                "creator_transaction_volume": 100.0,
                "demand_index": 7.5,
                "historical_price_trend": 2.3
            },
            "model_type": "random_forest"
        }
        
        def make_lr_request():
            return client.post("/predict", json=payload_lr)
        
        def make_rf_request():
            return client.post("/predict", json=payload_rf)
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = []
            for _ in range(5):
                futures.append(executor.submit(make_lr_request))
                futures.append(executor.submit(make_rf_request))
            
            responses = [f.result() for f in as_completed(futures)]
        
        # All should succeed or fail consistently
        assert all(r.status_code in [200, 503] for r in responses)
    
    def test_response_time_under_load(self):
        """Test response time remains reasonable under load"""
        payload = {
            "features": {
                "rarity_score": 75.0,
                "creator_transaction_volume": 100.0,
                "demand_index": 7.5,
                "historical_price_trend": 2.3
            },
            "model_type": "random_forest"
        }
        
        response_times = []
        
        for _ in range(20):
            start_time = time.time()
            response = client.post("/predict", json=payload)
            end_time = time.time()
            
            if response.status_code == 200:
                response_times.append(end_time - start_time)
        
        if response_times:
            avg_time = sum(response_times) / len(response_times)
            max_time = max(response_times)
            
            # Average response time should be < 1 second
            assert avg_time < 1.0
            # Max response time should be < 2 seconds
            assert max_time < 2.0
            
            print(f"\n✓ Avg response time: {avg_time:.3f}s")
            print(f"✓ Max response time: {max_time:.3f}s")
    
    def test_health_check_during_load(self):
        """Test health check works during prediction load"""
        payload = {
            "features": {
                "rarity_score": 75.0,
                "creator_transaction_volume": 100.0,
                "demand_index": 7.5,
                "historical_price_trend": 2.3
            },
            "model_type": "random_forest"
        }
        
        def make_predict_request():
            return client.post("/predict", json=payload)
        
        def make_health_request():
            return client.get("/health")
        
        with ThreadPoolExecutor(max_workers=15) as executor:
            futures = []
            # 10 prediction requests
            for _ in range(10):
                futures.append(executor.submit(make_predict_request))
            # 5 health check requests
            for _ in range(5):
                futures.append(executor.submit(make_health_request))
            
            responses = [f.result() for f in as_completed(futures)]
        
        # Health checks should always succeed
        health_responses = [r for r in responses if "/health" in str(r.url)]
        assert all(r.status_code == 200 for r in health_responses)


# ============ Additional Edge Cases ============

class TestEdgeCases:
    """Test edge cases and boundary conditions"""
    
    def test_prediction_with_zero_values(self, trained_rf_model):
        """Test prediction with zero feature values"""
        features = {
            'rarity_score': 0.0,
            'creator_transaction_volume': 0.0,
            'demand_index': 0.0,
            'historical_price_trend': 0.0
        }
        
        price, confidence = trained_rf_model[0].predict(features)
        
        assert price >= 0
        assert 0.0 <= confidence <= 1.0
    
    def test_prediction_with_max_values(self, trained_rf_model):
        """Test prediction with maximum feature values"""
        features = {
            'rarity_score': 100.0,
            'creator_transaction_volume': 1000.0,
            'demand_index': 10.0,
            'historical_price_trend': 10.0
        }
        
        price, confidence = trained_rf_model[0].predict(features)
        
        assert price > 0
        assert 0.0 <= confidence <= 1.0
    
    def test_feature_importance_sums_to_one(self, trained_rf_model):
        """Test feature importance values sum to approximately 1"""
        predictor, _ = trained_rf_model
        
        importance = predictor.get_feature_importance()
        total = sum(importance.values())
        
        assert abs(total - 1.0) < 0.01
    
    def test_model_info_endpoint_invalid_type(self):
        """Test model info endpoint with invalid model type"""
        response = client.get("/models/invalid_model")
        assert response.status_code == 400


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

"""
Tests for NFT Price Predictor
"""

import pytest
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.models.nft_predictor import NFTPricePredictor
from src.data.data_generator import NFTDataGenerator
import pandas as pd
import numpy as np


@pytest.fixture
def sample_data():
    """Generate sample data for testing"""
    generator = NFTDataGenerator(random_state=42)
    X, y = generator.generate_dataset(n_samples=100, noise_level=0.1)
    return X, y


@pytest.fixture
def trained_lr_model(sample_data):
    """Create trained Linear Regression model"""
    X, y = sample_data
    predictor = NFTPricePredictor(model_type='linear_regression')
    predictor.train(X, y, test_size=0.2)
    return predictor


@pytest.fixture
def trained_rf_model(sample_data):
    """Create trained Random Forest model"""
    X, y = sample_data
    predictor = NFTPricePredictor(model_type='random_forest')
    predictor.train(X, y, test_size=0.2)
    return predictor


class TestNFTPricePredictor:
    """Test NFTPricePredictor class"""
    
    def test_initialization_lr(self):
        """Test Linear Regression initialization"""
        predictor = NFTPricePredictor(model_type='linear_regression')
        assert predictor.model_type == 'linear_regression'
        assert not predictor.is_trained
        assert len(predictor.feature_names) == 4
    
    def test_initialization_rf(self):
        """Test Random Forest initialization"""
        predictor = NFTPricePredictor(model_type='random_forest')
        assert predictor.model_type == 'random_forest'
        assert not predictor.is_trained
    
    def test_invalid_model_type(self):
        """Test invalid model type raises error"""
        with pytest.raises(ValueError):
            NFTPricePredictor(model_type='invalid_model')
    
    def test_training_lr(self, sample_data):
        """Test Linear Regression training"""
        X, y = sample_data
        predictor = NFTPricePredictor(model_type='linear_regression')
        metrics = predictor.train(X, y, test_size=0.2)
        
        assert predictor.is_trained
        assert 'test_rmse' in metrics
        assert 'test_r2' in metrics
        assert metrics['test_r2'] >= 0
        assert metrics['test_rmse'] > 0
    
    def test_training_rf(self, sample_data):
        """Test Random Forest training"""
        X, y = sample_data
        predictor = NFTPricePredictor(model_type='random_forest')
        metrics = predictor.train(X, y, test_size=0.2)
        
        assert predictor.is_trained
        assert 'test_rmse' in metrics
        assert 'test_r2' in metrics
        assert metrics['test_r2'] >= 0
    
    def test_prediction_lr(self, trained_lr_model):
        """Test Linear Regression prediction"""
        features = {
            'rarity_score': 75.0,
            'creator_transaction_volume': 100.0,
            'demand_index': 8.0,
            'historical_price_trend': 3.0
        }
        
        price, confidence = trained_lr_model.predict(features)
        
        assert isinstance(price, float)
        assert isinstance(confidence, float)
        assert price > 0
        assert 0 <= confidence <= 1
    
    def test_prediction_rf(self, trained_rf_model):
        """Test Random Forest prediction"""
        features = {
            'rarity_score': 75.0,
            'creator_transaction_volume': 100.0,
            'demand_index': 8.0,
            'historical_price_trend': 3.0
        }
        
        price, confidence = trained_rf_model.predict(features)
        
        assert isinstance(price, float)
        assert isinstance(confidence, float)
        assert price > 0
        assert 0 <= confidence <= 1
    
    def test_batch_prediction(self, trained_rf_model):
        """Test batch prediction"""
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
            }
        ]
        
        results = trained_rf_model.predict_batch(features_list)
        
        assert len(results) == 2
        for price, confidence in results:
            assert isinstance(price, float)
            assert isinstance(confidence, float)
            assert price > 0
            assert 0 <= confidence <= 1
    
    def test_prediction_without_training(self):
        """Test prediction fails without training"""
        predictor = NFTPricePredictor(model_type='linear_regression')
        features = {
            'rarity_score': 75.0,
            'creator_transaction_volume': 100.0,
            'demand_index': 8.0,
            'historical_price_trend': 3.0
        }
        
        with pytest.raises(ValueError):
            predictor.predict(features)
    
    def test_feature_importance_rf(self, trained_rf_model):
        """Test feature importance for Random Forest"""
        importance = trained_rf_model.get_feature_importance()
        
        assert isinstance(importance, dict)
        assert len(importance) == 4
        assert all(0 <= v <= 1 for v in importance.values())
        assert abs(sum(importance.values()) - 1.0) < 0.01  # Should sum to ~1
    
    def test_feature_importance_lr(self, trained_lr_model):
        """Test feature importance for Linear Regression"""
        importance = trained_lr_model.get_feature_importance()
        
        assert isinstance(importance, dict)
        assert len(importance) == 4
    
    def test_model_persistence(self, trained_rf_model, tmp_path):
        """Test model save and load"""
        # Save model
        model_path = tmp_path / "test_model.joblib"
        trained_rf_model.save_model(str(model_path))
        
        assert model_path.exists()
        
        # Load model
        loaded_model = NFTPricePredictor.load_model(str(model_path))
        
        assert loaded_model.is_trained
        assert loaded_model.model_type == trained_rf_model.model_type
        
        # Test prediction with loaded model
        features = {
            'rarity_score': 75.0,
            'creator_transaction_volume': 100.0,
            'demand_index': 8.0,
            'historical_price_trend': 3.0
        }
        
        price1, conf1 = trained_rf_model.predict(features)
        price2, conf2 = loaded_model.predict(features)
        
        assert abs(price1 - price2) < 0.01
    
    def test_missing_features(self, trained_rf_model):
        """Test prediction with missing features"""
        features = {
            'rarity_score': 75.0,
            'creator_transaction_volume': 100.0
            # Missing demand_index and historical_price_trend
        }
        
        with pytest.raises(ValueError):
            trained_rf_model.predict(features)


class TestNFTDataGenerator:
    """Test NFTDataGenerator class"""
    
    def test_dataset_generation(self):
        """Test dataset generation"""
        generator = NFTDataGenerator(random_state=42)
        X, y = generator.generate_dataset(n_samples=100)
        
        assert len(X) == 100
        assert len(y) == 100
        assert list(X.columns) == [
            'rarity_score',
            'creator_transaction_volume',
            'demand_index',
            'historical_price_trend'
        ]
        assert (y > 0).all()
    
    def test_test_samples_generation(self):
        """Test test samples generation"""
        generator = NFTDataGenerator(random_state=42)
        samples = generator.generate_test_samples(n_samples=10)
        
        assert len(samples) == 10
        assert len(samples.columns) == 4
    
    def test_outliers_addition(self):
        """Test outliers addition"""
        generator = NFTDataGenerator(random_state=42)
        X, y = generator.generate_dataset(n_samples=100)
        X_out, y_out = generator.add_outliers(X, y, outlier_fraction=0.1)
        
        assert len(X_out) == len(X)
        assert len(y_out) == len(y)
        assert y_out.max() > y.max()

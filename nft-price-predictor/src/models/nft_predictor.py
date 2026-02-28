"""
NFT Price Prediction Models
Implements Linear Regression and Random Forest models
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
import joblib
import os
from typing import Dict, Tuple, List
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NFTPricePredictor:
    """
    NFT Price Prediction using Linear Regression and Random Forest
    """
    
    def __init__(self, model_type: str = 'random_forest'):
        """
        Initialize the predictor
        
        Args:
            model_type: 'linear_regression' or 'random_forest'
        """
        self.model_type = model_type
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = [
            'rarity_score',
            'creator_transaction_volume',
            'demand_index',
            'historical_price_trend'
        ]
        self.is_trained = False
        
        # Initialize model based on type
        if model_type == 'linear_regression':
            self.model = LinearRegression()
        elif model_type == 'random_forest':
            self.model = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            )
        else:
            raise ValueError(f"Unknown model type: {model_type}")
    
    def prepare_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare and validate features
        
        Args:
            data: DataFrame with feature columns
            
        Returns:
            Prepared DataFrame
        """
        # Ensure all required features are present
        missing_features = set(self.feature_names) - set(data.columns)
        if missing_features:
            raise ValueError(f"Missing features: {missing_features}")
        
        # Select only required features in correct order
        features = data[self.feature_names].copy()
        
        # Handle missing values
        features = features.fillna(features.mean())
        
        # Validate ranges
        if (features < 0).any().any():
            logger.warning("Negative values detected in features")
        
        return features
    
    def train(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        test_size: float = 0.2,
        random_state: int = 42
    ) -> Dict[str, float]:
        """
        Train the model
        
        Args:
            X: Feature DataFrame
            y: Target prices
            test_size: Proportion of test set
            random_state: Random seed
            
        Returns:
            Dictionary with evaluation metrics
        """
        logger.info(f"Training {self.model_type} model...")
        
        # Prepare features
        X_prepared = self.prepare_features(X)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_prepared, y, test_size=test_size, random_state=random_state
        )
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train model
        self.model.fit(X_train_scaled, y_train)
        self.is_trained = True
        
        # Make predictions
        y_train_pred = self.model.predict(X_train_scaled)
        y_test_pred = self.model.predict(X_test_scaled)
        
        # Calculate metrics
        metrics = {
            'train_rmse': np.sqrt(mean_squared_error(y_train, y_train_pred)),
            'test_rmse': np.sqrt(mean_squared_error(y_test, y_test_pred)),
            'train_r2': r2_score(y_train, y_train_pred),
            'test_r2': r2_score(y_test, y_test_pred),
            'train_mae': mean_absolute_error(y_train, y_train_pred),
            'test_mae': mean_absolute_error(y_test, y_test_pred)
        }
        
        # Cross-validation
        cv_scores = cross_val_score(
            self.model, X_train_scaled, y_train,
            cv=5, scoring='neg_mean_squared_error'
        )
        metrics['cv_rmse'] = np.sqrt(-cv_scores.mean())
        metrics['cv_rmse_std'] = np.sqrt(cv_scores.std())
        
        logger.info(f"Training completed. Test RMSE: {metrics['test_rmse']:.2f}, Test R²: {metrics['test_r2']:.4f}")
        
        return metrics
    
    def predict(
        self,
        features: Dict[str, float]
    ) -> Tuple[float, float]:
        """
        Predict NFT price
        
        Args:
            features: Dictionary with feature values
            
        Returns:
            Tuple of (predicted_price, confidence_score)
        """
        if not self.is_trained:
            raise ValueError("Model must be trained before prediction")
        
        # Convert to DataFrame
        X = pd.DataFrame([features])
        X_prepared = self.prepare_features(X)
        
        # Scale features
        X_scaled = self.scaler.transform(X_prepared)
        
        # Predict
        prediction = self.model.predict(X_scaled)[0]
        
        # Calculate confidence score
        confidence = self._calculate_confidence(X_scaled)
        
        return float(prediction), float(confidence)
    
    def predict_batch(
        self,
        features_list: List[Dict[str, float]]
    ) -> List[Tuple[float, float]]:
        """
        Predict prices for multiple NFTs
        
        Args:
            features_list: List of feature dictionaries
            
        Returns:
            List of (predicted_price, confidence_score) tuples
        """
        if not self.is_trained:
            raise ValueError("Model must be trained before prediction")
        
        # Convert to DataFrame
        X = pd.DataFrame(features_list)
        X_prepared = self.prepare_features(X)
        
        # Scale features
        X_scaled = self.scaler.transform(X_prepared)
        
        # Predict
        predictions = self.model.predict(X_scaled)
        
        # Calculate confidence scores
        confidences = [self._calculate_confidence(x.reshape(1, -1)) for x in X_scaled]
        
        return list(zip(predictions.tolist(), confidences))
    
    def _calculate_confidence(self, X_scaled: np.ndarray) -> float:
        """
        Calculate prediction confidence score
        
        Args:
            X_scaled: Scaled feature array
            
        Returns:
            Confidence score between 0 and 1
        """
        if self.model_type == 'random_forest':
            # Use prediction variance from trees
            predictions = np.array([tree.predict(X_scaled) for tree in self.model.estimators_])
            std = predictions.std()
            mean = predictions.mean()
            
            # Coefficient of variation (inverse for confidence)
            if mean != 0:
                cv = std / abs(mean)
                confidence = 1 / (1 + cv)
            else:
                confidence = 0.5
        else:
            # For linear regression, use a simpler heuristic
            # Based on feature values being within training range
            confidence = 0.75  # Default confidence for linear regression
        
        return min(max(confidence, 0.0), 1.0)
    
    def get_feature_importance(self) -> Dict[str, float]:
        """
        Get feature importance scores
        
        Returns:
            Dictionary mapping feature names to importance scores
        """
        if not self.is_trained:
            raise ValueError("Model must be trained first")
        
        if self.model_type == 'random_forest':
            importances = self.model.feature_importances_
        elif self.model_type == 'linear_regression':
            # Use absolute coefficients as importance
            importances = np.abs(self.model.coef_)
            importances = importances / importances.sum()  # Normalize
        else:
            return {}
        
        return dict(zip(self.feature_names, importances.tolist()))
    
    def save_model(self, filepath: str):
        """
        Save model to disk
        
        Args:
            filepath: Path to save model
        """
        if not self.is_trained:
            raise ValueError("Cannot save untrained model")
        
        model_data = {
            'model': self.model,
            'scaler': self.scaler,
            'model_type': self.model_type,
            'feature_names': self.feature_names,
            'is_trained': self.is_trained
        }
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(model_data, filepath)
        logger.info(f"Model saved to {filepath}")
    
    @classmethod
    def load_model(cls, filepath: str) -> 'NFTPricePredictor':
        """
        Load model from disk
        
        Args:
            filepath: Path to load model from
            
        Returns:
            Loaded NFTPricePredictor instance
        """
        model_data = joblib.load(filepath)
        
        predictor = cls(model_type=model_data['model_type'])
        predictor.model = model_data['model']
        predictor.scaler = model_data['scaler']
        predictor.feature_names = model_data['feature_names']
        predictor.is_trained = model_data['is_trained']
        
        logger.info(f"Model loaded from {filepath}")
        return predictor

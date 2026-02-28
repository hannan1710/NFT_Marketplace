"""
Anomaly detection using Isolation Forest
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from typing import Dict, List, Tuple
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AnomalyDetector:
    """
    Detect anomalies in NFT transactions using Isolation Forest
    """
    
    def __init__(self, contamination: float = 0.1, random_state: int = 42):
        """
        Initialize anomaly detector
        
        Args:
            contamination: Expected proportion of outliers (0.1 = 10%)
            random_state: Random seed for reproducibility
        """
        self.contamination = contamination
        self.random_state = random_state
        self.model = IsolationForest(
            contamination=contamination,
            random_state=random_state,
            n_estimators=100,
            max_samples='auto',
            n_jobs=-1
        )
        self.scaler = StandardScaler()
        self.is_fitted = False
        self.feature_names = []
    
    def fit(self, transactions: pd.DataFrame):
        """
        Fit the anomaly detector on transaction data
        
        Args:
            transactions: DataFrame with transaction features
        """
        logger.info(f"Fitting anomaly detector on {len(transactions)} transactions")
        
        # Extract features
        features = self._extract_features(transactions)
        self.feature_names = list(features.columns)
        
        # Scale features
        features_scaled = self.scaler.fit_transform(features)
        
        # Fit model
        self.model.fit(features_scaled)
        self.is_fitted = True
        
        logger.info("Anomaly detector fitted successfully")
    
    def predict_anomaly_score(
        self,
        transaction: Dict
    ) -> Tuple[float, bool]:
        """
        Predict anomaly score for a transaction
        
        Args:
            transaction: Transaction dictionary
            
        Returns:
            Tuple of (anomaly_score, is_anomaly)
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before prediction")
        
        # Convert to DataFrame
        df = pd.DataFrame([transaction])
        
        # Extract features
        features = self._extract_features(df)
        
        # Scale features
        features_scaled = self.scaler.transform(features)
        
        # Predict
        # Isolation Forest returns -1 for anomalies, 1 for normal
        prediction = self.model.predict(features_scaled)[0]
        is_anomaly = prediction == -1
        
        # Get anomaly score (lower = more anomalous)
        # Score is in range [-1, 1], we convert to [0, 1]
        raw_score = self.model.score_samples(features_scaled)[0]
        anomaly_score = self._normalize_score(raw_score)
        
        return anomaly_score, is_anomaly
    
    def _extract_features(self, transactions: pd.DataFrame) -> pd.DataFrame:
        """
        Extract features from transactions
        
        Args:
            transactions: Transaction DataFrame
            
        Returns:
            Feature DataFrame
        """
        features = pd.DataFrame()
        
        # Price features
        features['price'] = transactions.get('price', 0)
        features['price_log'] = np.log1p(transactions.get('price', 0))
        
        # Volume features
        features['buyer_volume'] = transactions.get('buyer_volume', 0)
        features['seller_volume'] = transactions.get('seller_volume', 0)
        features['volume_ratio'] = self._safe_divide(
            transactions.get('buyer_volume', 0),
            transactions.get('seller_volume', 1)
        )
        
        # Time features
        features['time_since_last_tx'] = transactions.get('time_since_last_tx', 0)
        features['tx_frequency'] = transactions.get('tx_frequency', 0)
        
        # Wallet features
        features['wallet_age'] = transactions.get('wallet_age', 0)
        features['unique_counterparties'] = transactions.get('unique_counterparties', 0)
        
        # Price change features
        features['price_change_pct'] = transactions.get('price_change_pct', 0)
        features['price_volatility'] = transactions.get('price_volatility', 0)
        
        # Network features
        features['wallet_connections'] = transactions.get('wallet_connections', 0)
        features['clustering_coefficient'] = transactions.get('clustering_coefficient', 0)
        
        return features
    
    def _safe_divide(self, numerator, denominator):
        """Safe division avoiding divide by zero"""
        return np.where(denominator != 0, numerator / denominator, 0)
    
    def _normalize_score(self, raw_score: float) -> float:
        """
        Normalize Isolation Forest score to [0, 1]
        Lower score = more anomalous
        
        Args:
            raw_score: Raw score from Isolation Forest
            
        Returns:
            Normalized score (0 = most anomalous, 1 = most normal)
        """
        # Isolation Forest scores are typically in range [-0.5, 0.5]
        # We map this to [0, 1] where 0 is most anomalous
        normalized = (raw_score + 0.5) / 1.0
        return max(0.0, min(1.0, normalized))

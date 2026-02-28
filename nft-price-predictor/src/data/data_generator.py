"""
Synthetic NFT data generator for training
"""

import numpy as np
import pandas as pd
from typing import Tuple
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NFTDataGenerator:
    """
    Generate synthetic NFT data for training and testing
    """
    
    def __init__(self, random_state: int = 42):
        """
        Initialize data generator
        
        Args:
            random_state: Random seed for reproducibility
        """
        self.random_state = random_state
        np.random.seed(random_state)
    
    def generate_dataset(
        self,
        n_samples: int = 1000,
        noise_level: float = 0.1
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Generate synthetic NFT dataset
        
        Args:
            n_samples: Number of samples to generate
            noise_level: Amount of random noise to add
            
        Returns:
            Tuple of (features DataFrame, prices Series)
        """
        logger.info(f"Generating {n_samples} synthetic NFT samples...")
        
        # Generate features
        rarity_score = np.random.uniform(0, 100, n_samples)
        creator_volume = np.random.exponential(50, n_samples)
        demand_index = np.random.uniform(0, 10, n_samples)
        price_trend = np.random.uniform(-5, 5, n_samples)
        
        # Create DataFrame
        data = pd.DataFrame({
            'rarity_score': rarity_score,
            'creator_transaction_volume': creator_volume,
            'demand_index': demand_index,
            'historical_price_trend': price_trend
        })
        
        # Generate prices based on features with realistic relationships
        base_price = (
            rarity_score * 10 +                    # Rarity is most important
            creator_volume * 2 +                   # Creator reputation matters
            demand_index * 50 +                    # Demand drives price
            price_trend * 30                       # Trend influences price
        )
        
        # Add non-linear effects
        base_price += (rarity_score ** 1.5) * 0.5  # Exponential rarity effect
        base_price += np.log1p(creator_volume) * 20  # Logarithmic volume effect
        
        # Add interaction effects
        base_price += (rarity_score * demand_index) * 2
        
        # Add noise
        noise = np.random.normal(0, noise_level * base_price.std(), n_samples)
        prices = base_price + noise
        
        # Ensure positive prices
        prices = np.maximum(prices, 100)
        
        logger.info(f"Generated dataset with price range: ${prices.min():.2f} - ${prices.max():.2f}")
        logger.info(f"Mean price: ${prices.mean():.2f}, Std: ${prices.std():.2f}")
        
        return data, pd.Series(prices, name='price')
    
    def generate_test_samples(self, n_samples: int = 10) -> pd.DataFrame:
        """
        Generate test samples for prediction
        
        Args:
            n_samples: Number of test samples
            
        Returns:
            DataFrame with test features
        """
        return pd.DataFrame({
            'rarity_score': np.random.uniform(0, 100, n_samples),
            'creator_transaction_volume': np.random.exponential(50, n_samples),
            'demand_index': np.random.uniform(0, 10, n_samples),
            'historical_price_trend': np.random.uniform(-5, 5, n_samples)
        })
    
    def add_outliers(
        self,
        data: pd.DataFrame,
        prices: pd.Series,
        outlier_fraction: float = 0.05
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Add outliers to dataset for robustness testing
        
        Args:
            data: Feature DataFrame
            prices: Price Series
            outlier_fraction: Fraction of outliers to add
            
        Returns:
            Modified (data, prices) tuple
        """
        n_outliers = int(len(data) * outlier_fraction)
        outlier_indices = np.random.choice(len(data), n_outliers, replace=False)
        
        # Create extreme values
        prices_modified = prices.copy()
        prices_modified.iloc[outlier_indices] *= np.random.uniform(2, 5, n_outliers)
        
        logger.info(f"Added {n_outliers} outliers to dataset")
        
        return data, prices_modified

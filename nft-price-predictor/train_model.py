"""
Model training script
Train both Linear Regression and Random Forest models
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.models.nft_predictor import NFTPricePredictor
from src.data.data_generator import NFTDataGenerator
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import logging
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def plot_predictions(y_true, y_pred, model_name, save_path):
    """Plot actual vs predicted prices"""
    plt.figure(figsize=(10, 6))
    plt.scatter(y_true, y_pred, alpha=0.5)
    plt.plot([y_true.min(), y_true.max()], [y_true.min(), y_true.max()], 'r--', lw=2)
    plt.xlabel('Actual Price ($)')
    plt.ylabel('Predicted Price ($)')
    plt.title(f'{model_name} - Actual vs Predicted Prices')
    plt.tight_layout()
    plt.savefig(save_path)
    plt.close()
    logger.info(f"Saved prediction plot to {save_path}")


def plot_feature_importance(importance_dict, model_name, save_path):
    """Plot feature importance"""
    features = list(importance_dict.keys())
    importances = list(importance_dict.values())
    
    plt.figure(figsize=(10, 6))
    plt.barh(features, importances)
    plt.xlabel('Importance')
    plt.title(f'{model_name} - Feature Importance')
    plt.tight_layout()
    plt.savefig(save_path)
    plt.close()
    logger.info(f"Saved feature importance plot to {save_path}")


def train_and_evaluate_model(model_type, X, y, model_dir, plots_dir):
    """Train and evaluate a single model"""
    logger.info(f"\n{'='*60}")
    logger.info(f"Training {model_type.upper()} model")
    logger.info(f"{'='*60}")
    
    # Initialize predictor
    predictor = NFTPricePredictor(model_type=model_type)
    
    # Train model
    metrics = predictor.train(X, y, test_size=0.2, random_state=42)
    
    # Print metrics
    logger.info("\nTraining Metrics:")
    logger.info(f"  Train RMSE: ${metrics['train_rmse']:.2f}")
    logger.info(f"  Train R²: {metrics['train_r2']:.4f}")
    logger.info(f"  Train MAE: ${metrics['train_mae']:.2f}")
    
    logger.info("\nTest Metrics:")
    logger.info(f"  Test RMSE: ${metrics['test_rmse']:.2f}")
    logger.info(f"  Test R²: {metrics['test_r2']:.4f}")
    logger.info(f"  Test MAE: ${metrics['test_mae']:.2f}")
    
    logger.info("\nCross-Validation:")
    logger.info(f"  CV RMSE: ${metrics['cv_rmse']:.2f} (+/- ${metrics['cv_rmse_std']:.2f})")
    
    # Get feature importance
    importance = predictor.get_feature_importance()
    logger.info("\nFeature Importance:")
    for feature, imp in sorted(importance.items(), key=lambda x: x[1], reverse=True):
        logger.info(f"  {feature}: {imp:.4f}")
    
    # Save model
    model_path = os.path.join(model_dir, f'{model_type}_model.joblib')
    predictor.save_model(model_path)
    
    # Generate predictions for plotting
    from sklearn.model_selection import train_test_split
    X_prepared = predictor.prepare_features(X)
    X_train, X_test, y_train, y_test = train_test_split(
        X_prepared, y, test_size=0.2, random_state=42
    )
    X_test_scaled = predictor.scaler.transform(X_test)
    y_pred = predictor.model.predict(X_test_scaled)
    
    # Plot predictions
    plot_path = os.path.join(plots_dir, f'{model_type}_predictions.png')
    plot_predictions(y_test, y_pred, model_type.replace('_', ' ').title(), plot_path)
    
    # Plot feature importance
    importance_path = os.path.join(plots_dir, f'{model_type}_importance.png')
    plot_feature_importance(importance, model_type.replace('_', ' ').title(), importance_path)
    
    return predictor, metrics


def main():
    """Main training function"""
    logger.info("Starting NFT Price Prediction Model Training")
    logger.info(f"Timestamp: {datetime.now().isoformat()}")
    
    # Create directories
    model_dir = 'models'
    plots_dir = 'plots'
    os.makedirs(model_dir, exist_ok=True)
    os.makedirs(plots_dir, exist_ok=True)
    
    # Generate synthetic data
    logger.info("\nGenerating synthetic NFT dataset...")
    generator = NFTDataGenerator(random_state=42)
    X, y = generator.generate_dataset(n_samples=2000, noise_level=0.1)
    
    # Display dataset statistics
    logger.info("\nDataset Statistics:")
    logger.info(f"  Number of samples: {len(X)}")
    logger.info(f"  Features: {list(X.columns)}")
    logger.info(f"\nFeature Statistics:")
    logger.info(X.describe())
    logger.info(f"\nPrice Statistics:")
    logger.info(y.describe())
    
    # Train Linear Regression
    lr_predictor, lr_metrics = train_and_evaluate_model(
        'linear_regression', X, y, model_dir, plots_dir
    )
    
    # Train Random Forest
    rf_predictor, rf_metrics = train_and_evaluate_model(
        'random_forest', X, y, model_dir, plots_dir
    )
    
    # Compare models
    logger.info(f"\n{'='*60}")
    logger.info("Model Comparison")
    logger.info(f"{'='*60}")
    logger.info(f"\nLinear Regression:")
    logger.info(f"  Test RMSE: ${lr_metrics['test_rmse']:.2f}")
    logger.info(f"  Test R²: {lr_metrics['test_r2']:.4f}")
    logger.info(f"\nRandom Forest:")
    logger.info(f"  Test RMSE: ${rf_metrics['test_rmse']:.2f}")
    logger.info(f"  Test R²: {rf_metrics['test_r2']:.4f}")
    
    # Determine best model
    if rf_metrics['test_r2'] > lr_metrics['test_r2']:
        best_model = 'Random Forest'
        best_r2 = rf_metrics['test_r2']
    else:
        best_model = 'Linear Regression'
        best_r2 = lr_metrics['test_r2']
    
    logger.info(f"\nBest Model: {best_model} (R² = {best_r2:.4f})")
    
    # Test predictions on new samples
    logger.info(f"\n{'='*60}")
    logger.info("Testing Predictions on New Samples")
    logger.info(f"{'='*60}")
    
    test_samples = generator.generate_test_samples(n_samples=5)
    logger.info("\nTest Samples:")
    logger.info(test_samples)
    
    logger.info("\nLinear Regression Predictions:")
    for idx, row in test_samples.iterrows():
        price, confidence = lr_predictor.predict(row.to_dict())
        logger.info(f"  Sample {idx+1}: ${price:.2f} (confidence: {confidence:.2%})")
    
    logger.info("\nRandom Forest Predictions:")
    for idx, row in test_samples.iterrows():
        price, confidence = rf_predictor.predict(row.to_dict())
        logger.info(f"  Sample {idx+1}: ${price:.2f} (confidence: {confidence:.2%})")
    
    logger.info(f"\n{'='*60}")
    logger.info("Training Complete!")
    logger.info(f"{'='*60}")
    logger.info(f"\nModels saved to: {model_dir}/")
    logger.info(f"Plots saved to: {plots_dir}/")


if __name__ == '__main__':
    main()

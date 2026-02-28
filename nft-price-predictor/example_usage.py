"""
Example usage of NFT Price Prediction API
"""

import requests
import json

API_URL = "http://localhost:8000"


def check_health():
    """Check API health"""
    print("=== Health Check ===")
    response = requests.get(f"{API_URL}/health")
    print(json.dumps(response.json(), indent=2))
    print()


def get_models_info():
    """Get models information"""
    print("=== Models Information ===")
    response = requests.get(f"{API_URL}/models")
    print(json.dumps(response.json(), indent=2))
    print()


def predict_single_nft():
    """Predict price for a single NFT"""
    print("=== Single NFT Prediction ===")
    
    # High-value NFT
    payload = {
        "features": {
            "rarity_score": 95.0,
            "creator_transaction_volume": 500.0,
            "demand_index": 9.5,
            "historical_price_trend": 4.5
        },
        "model_type": "random_forest"
    }
    
    response = requests.post(f"{API_URL}/predict", json=payload)
    result = response.json()
    
    print("High-Value NFT:")
    print(f"  Predicted Price: ${result['predicted_price']:.2f}")
    print(f"  Confidence: {result['confidence_score']:.2%}")
    print(f"  Model: {result['model_type']}")
    print()
    
    # Medium-value NFT
    payload = {
        "features": {
            "rarity_score": 60.0,
            "creator_transaction_volume": 100.0,
            "demand_index": 5.0,
            "historical_price_trend": 1.0
        },
        "model_type": "random_forest"
    }
    
    response = requests.post(f"{API_URL}/predict", json=payload)
    result = response.json()
    
    print("Medium-Value NFT:")
    print(f"  Predicted Price: ${result['predicted_price']:.2f}")
    print(f"  Confidence: {result['confidence_score']:.2%}")
    print()
    
    # Low-value NFT
    payload = {
        "features": {
            "rarity_score": 20.0,
            "creator_transaction_volume": 10.0,
            "demand_index": 2.0,
            "historical_price_trend": -1.0
        },
        "model_type": "random_forest"
    }
    
    response = requests.post(f"{API_URL}/predict", json=payload)
    result = response.json()
    
    print("Low-Value NFT:")
    print(f"  Predicted Price: ${result['predicted_price']:.2f}")
    print(f"  Confidence: {result['confidence_score']:.2%}")
    print()


def compare_models():
    """Compare Linear Regression vs Random Forest"""
    print("=== Model Comparison ===")
    
    features = {
        "rarity_score": 75.0,
        "creator_transaction_volume": 150.0,
        "demand_index": 7.0,
        "historical_price_trend": 2.5
    }
    
    # Linear Regression
    payload = {
        "features": features,
        "model_type": "linear_regression"
    }
    response = requests.post(f"{API_URL}/predict", json=payload)
    lr_result = response.json()
    
    # Random Forest
    payload = {
        "features": features,
        "model_type": "random_forest"
    }
    response = requests.post(f"{API_URL}/predict", json=payload)
    rf_result = response.json()
    
    print("Same NFT, Different Models:")
    print(f"\nLinear Regression:")
    print(f"  Price: ${lr_result['predicted_price']:.2f}")
    print(f"  Confidence: {lr_result['confidence_score']:.2%}")
    
    print(f"\nRandom Forest:")
    print(f"  Price: ${rf_result['predicted_price']:.2f}")
    print(f"  Confidence: {rf_result['confidence_score']:.2%}")
    
    print(f"\nPrice Difference: ${abs(lr_result['predicted_price'] - rf_result['predicted_price']):.2f}")
    print()


def batch_prediction():
    """Batch prediction for multiple NFTs"""
    print("=== Batch Prediction ===")
    
    payload = {
        "features_list": [
            {
                "rarity_score": 90.0,
                "creator_transaction_volume": 300.0,
                "demand_index": 8.5,
                "historical_price_trend": 3.5
            },
            {
                "rarity_score": 70.0,
                "creator_transaction_volume": 120.0,
                "demand_index": 6.0,
                "historical_price_trend": 1.5
            },
            {
                "rarity_score": 50.0,
                "creator_transaction_volume": 60.0,
                "demand_index": 4.0,
                "historical_price_trend": 0.5
            },
            {
                "rarity_score": 30.0,
                "creator_transaction_volume": 20.0,
                "demand_index": 2.5,
                "historical_price_trend": -0.5
            }
        ],
        "model_type": "random_forest"
    }
    
    response = requests.post(f"{API_URL}/batch-predict", json=payload)
    result = response.json()
    
    print(f"Predicted {result['total_predictions']} NFT prices:\n")
    
    for i, pred in enumerate(result['predictions'], 1):
        print(f"NFT {i}:")
        print(f"  Price: ${pred['predicted_price']:.2f}")
        print(f"  Confidence: {pred['confidence_score']:.2%}")
        print()


def feature_importance():
    """Display feature importance"""
    print("=== Feature Importance ===")
    
    response = requests.get(f"{API_URL}/models/random_forest")
    result = response.json()
    
    if result['is_loaded'] and result['feature_importance']:
        print("Random Forest Feature Importance:\n")
        
        # Sort by importance
        importance = sorted(
            result['feature_importance'].items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        for feature, score in importance:
            bar = '█' * int(score * 50)
            print(f"{feature:30s} {bar} {score:.2%}")
    
    print()


def main():
    """Run all examples"""
    print("\n" + "="*60)
    print("NFT Price Prediction API - Usage Examples")
    print("="*60 + "\n")
    
    try:
        check_health()
        get_models_info()
        predict_single_nft()
        compare_models()
        batch_prediction()
        feature_importance()
        
        print("="*60)
        print("Examples completed successfully!")
        print("="*60)
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to API server.")
        print("Please ensure the server is running:")
        print("  uvicorn src.api.main:app --reload")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()

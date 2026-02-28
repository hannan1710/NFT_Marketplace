"""
FastAPI application for NFT price prediction
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.models.nft_predictor import NFTPricePredictor
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="NFT Price Prediction API",
    description="Machine learning-based NFT price prediction service",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instances
models = {}


# Pydantic models
class NFTFeatures(BaseModel):
    """NFT features for prediction"""
    rarity_score: float = Field(
        ...,
        ge=0,
        le=100,
        description="Rarity score (0-100)"
    )
    creator_transaction_volume: float = Field(
        ...,
        ge=0,
        description="Creator's transaction volume"
    )
    demand_index: float = Field(
        ...,
        ge=0,
        le=10,
        description="Demand index (0-10)"
    )
    historical_price_trend: float = Field(
        ...,
        ge=-10,
        le=10,
        description="Historical price trend (-10 to 10)"
    )
    
    class Config:
        schema_extra = {
            "example": {
                "rarity_score": 85.5,
                "creator_transaction_volume": 150.0,
                "demand_index": 7.5,
                "historical_price_trend": 2.3
            }
        }


class PredictionRequest(BaseModel):
    """Prediction request"""
    features: NFTFeatures
    model_type: Optional[str] = Field(
        "random_forest",
        description="Model type: 'linear_regression' or 'random_forest'"
    )
    
    @validator('model_type')
    def validate_model_type(cls, v):
        if v not in ['linear_regression', 'random_forest']:
            raise ValueError("model_type must be 'linear_regression' or 'random_forest'")
        return v


class BatchPredictionRequest(BaseModel):
    """Batch prediction request"""
    features_list: List[NFTFeatures] = Field(
        ...,
        max_items=100,
        description="List of NFT features (max 100)"
    )
    model_type: Optional[str] = Field(
        "random_forest",
        description="Model type: 'linear_regression' or 'random_forest'"
    )


class PredictionResponse(BaseModel):
    """Prediction response"""
    predicted_price: float = Field(..., description="Predicted price in USD")
    confidence_score: float = Field(..., description="Confidence score (0-1)")
    model_type: str = Field(..., description="Model used for prediction")
    timestamp: str = Field(..., description="Prediction timestamp")


class BatchPredictionResponse(BaseModel):
    """Batch prediction response"""
    predictions: List[PredictionResponse]
    total_predictions: int


class ModelInfo(BaseModel):
    """Model information"""
    model_type: str
    is_loaded: bool
    feature_names: List[str]
    feature_importance: Optional[Dict[str, float]] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: str
    models_loaded: Dict[str, bool]
    version: str


# Startup event
@app.on_event("startup")
async def load_models():
    """Load models on startup"""
    logger.info("Loading models...")
    
    model_dir = 'models'
    
    # Load Linear Regression
    try:
        lr_path = os.path.join(model_dir, 'linear_regression_model.joblib')
        if os.path.exists(lr_path):
            models['linear_regression'] = NFTPricePredictor.load_model(lr_path)
            logger.info("Linear Regression model loaded successfully")
        else:
            logger.warning(f"Linear Regression model not found at {lr_path}")
    except Exception as e:
        logger.error(f"Failed to load Linear Regression model: {e}")
    
    # Load Random Forest
    try:
        rf_path = os.path.join(model_dir, 'random_forest_model.joblib')
        if os.path.exists(rf_path):
            models['random_forest'] = NFTPricePredictor.load_model(rf_path)
            logger.info("Random Forest model loaded successfully")
        else:
            logger.warning(f"Random Forest model not found at {rf_path}")
    except Exception as e:
        logger.error(f"Failed to load Random Forest model: {e}")
    
    if not models:
        logger.warning("No models loaded! Please train models first using train_model.py")


# API Endpoints
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "NFT Price Prediction API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "predict": "/predict",
            "batch_predict": "/batch-predict",
            "models": "/models",
            "docs": "/docs"
        }
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        models_loaded={
            "linear_regression": "linear_regression" in models,
            "random_forest": "random_forest" in models
        },
        version="1.0.0"
    )


@app.post("/predict", response_model=PredictionResponse, tags=["Prediction"])
async def predict_price(request: PredictionRequest):
    """
    Predict NFT price based on features
    
    - **rarity_score**: Rarity score (0-100)
    - **creator_transaction_volume**: Creator's transaction volume
    - **demand_index**: Demand index (0-10)
    - **historical_price_trend**: Historical price trend (-10 to 10)
    - **model_type**: Model to use ('linear_regression' or 'random_forest')
    """
    # Check if model is loaded
    if request.model_type not in models:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model '{request.model_type}' is not loaded. Please train the model first."
        )
    
    try:
        # Get model
        predictor = models[request.model_type]
        
        # Convert features to dict
        features_dict = request.features.dict()
        
        # Make prediction
        predicted_price, confidence_score = predictor.predict(features_dict)
        
        return PredictionResponse(
            predicted_price=predicted_price,
            confidence_score=confidence_score,
            model_type=request.model_type,
            timestamp=datetime.now().isoformat()
        )
    
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )


@app.post("/batch-predict", response_model=BatchPredictionResponse, tags=["Prediction"])
async def batch_predict_price(request: BatchPredictionRequest):
    """
    Predict prices for multiple NFTs
    
    Maximum 100 predictions per request
    """
    # Check if model is loaded
    if request.model_type not in models:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model '{request.model_type}' is not loaded. Please train the model first."
        )
    
    try:
        # Get model
        predictor = models[request.model_type]
        
        # Convert features to list of dicts
        features_list = [f.dict() for f in request.features_list]
        
        # Make predictions
        results = predictor.predict_batch(features_list)
        
        # Format response
        predictions = [
            PredictionResponse(
                predicted_price=price,
                confidence_score=confidence,
                model_type=request.model_type,
                timestamp=datetime.now().isoformat()
            )
            for price, confidence in results
        ]
        
        return BatchPredictionResponse(
            predictions=predictions,
            total_predictions=len(predictions)
        )
    
    except Exception as e:
        logger.error(f"Batch prediction error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch prediction failed: {str(e)}"
        )


@app.get("/models", response_model=List[ModelInfo], tags=["Models"])
async def get_models_info():
    """Get information about loaded models"""
    models_info = []
    
    for model_type in ['linear_regression', 'random_forest']:
        if model_type in models:
            predictor = models[model_type]
            models_info.append(ModelInfo(
                model_type=model_type,
                is_loaded=True,
                feature_names=predictor.feature_names,
                feature_importance=predictor.get_feature_importance()
            ))
        else:
            models_info.append(ModelInfo(
                model_type=model_type,
                is_loaded=False,
                feature_names=[],
                feature_importance=None
            ))
    
    return models_info


@app.get("/models/{model_type}", response_model=ModelInfo, tags=["Models"])
async def get_model_info(model_type: str):
    """Get information about a specific model"""
    if model_type not in ['linear_regression', 'random_forest']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="model_type must be 'linear_regression' or 'random_forest'"
        )
    
    if model_type not in models:
        return ModelInfo(
            model_type=model_type,
            is_loaded=False,
            feature_names=[],
            feature_importance=None
        )
    
    predictor = models[model_type]
    return ModelInfo(
        model_type=model_type,
        is_loaded=True,
        feature_names=predictor.feature_names,
        feature_importance=predictor.get_feature_importance()
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)

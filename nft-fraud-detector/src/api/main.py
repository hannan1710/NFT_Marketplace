"""
FastAPI application for NFT fraud detection
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from src.engine.fraud_engine import FraudDetectionEngine
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="NFT Fraud Detection API",
    description="AI-powered fraud detection for NFT transactions",
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

# Global fraud engine
fraud_engine = FraudDetectionEngine()


# Pydantic models
class Transaction(BaseModel):
    """Transaction model"""
    transaction_id: Optional[str] = None
    nft_id: str
    seller: str
    buyer: str
    price: float = Field(..., gt=0)
    timestamp: Optional[int] = None
    buyer_volume: Optional[float] = 0
    seller_volume: Optional[float] = 0
    time_since_last_tx: Optional[float] = 0
    tx_frequency: Optional[float] = 0
    wallet_age: Optional[float] = 0
    unique_counterparties: Optional[int] = 0
    price_change_pct: Optional[float] = 0
    price_volatility: Optional[float] = 0
    wallet_connections: Optional[int] = 0
    clustering_coefficient: Optional[float] = 0
    
    class Config:
        schema_extra = {
            "example": {
                "transaction_id": "tx_12345",
                "nft_id": "nft_001",
                "seller": "0xABC...123",
                "buyer": "0xDEF...456",
                "price": 1500.0,
                "timestamp": 1640000000,
                "buyer_volume": 5000.0,
                "seller_volume": 3000.0
            }
        }


class RiskScoreRequest(BaseModel):
    """Risk score request"""
    transaction: Transaction
    wallet_history: Optional[List[Transaction]] = []
    nft_price_history: Optional[List[float]] = []


class RiskScoreResponse(BaseModel):
    """Risk score response"""
    transaction_id: Optional[str]
    wallet_address: str
    timestamp: str
    fraud_detected: bool
    risk_score: float = Field(..., ge=0, le=100)
    risk_category: str
    flags: List[str]
    anomaly_detection: Dict
    pattern_detection: Dict
    graph_analysis: Dict


class TrainingRequest(BaseModel):
    """Training request"""
    transactions: List[Transaction] = Field(..., max_items=10000)


class SuspiciousWalletsResponse(BaseModel):
    """Suspicious wallets response"""
    wallets: List[str]
    total_count: int


class FraudLogResponse(BaseModel):
    """Fraud log response"""
    log_entries: List[Dict]
    total_entries: int


class StatisticsResponse(BaseModel):
    """Statistics response"""
    is_trained: bool
    suspicious_wallets_count: int
    total_fraud_detections: int
    graph_statistics: Dict


class HealthResponse(BaseModel):
    """Health response"""
    status: str
    timestamp: str
    is_trained: bool
    version: str


# API Endpoints
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "NFT Fraud Detection API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "risk_score": "/risk-score",
            "train": "/train",
            "suspicious_wallets": "/suspicious-wallets",
            "fraud_log": "/fraud-log",
            "statistics": "/statistics",
            "docs": "/docs"
        }
    }


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        is_trained=fraud_engine.is_trained,
        version="1.0.0"
    )


@app.post("/risk-score", response_model=RiskScoreResponse, tags=["Fraud Detection"])
async def calculate_risk_score(request: RiskScoreRequest):
    """
    Calculate fraud risk score for a transaction
    
    - **transaction**: Transaction details
    - **wallet_history**: Historical transactions for the wallet (optional)
    - **nft_price_history**: Historical prices for the NFT (optional)
    
    Returns comprehensive fraud analysis with risk score (0-100)
    """
    try:
        # Convert Pydantic models to dicts
        transaction_dict = request.transaction.dict()
        wallet_history = [tx.dict() for tx in request.wallet_history] if request.wallet_history else []
        nft_price_history = request.nft_price_history or []
        
        # Analyze transaction
        results = fraud_engine.analyze_transaction(
            transaction_dict,
            wallet_history,
            nft_price_history
        )
        
        return RiskScoreResponse(**results)
    
    except Exception as e:
        logger.error(f"Risk score calculation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Risk score calculation failed: {str(e)}"
        )


@app.post("/train", tags=["Training"])
async def train_engine(request: TrainingRequest):
    """
    Train the fraud detection engine
    
    - **transactions**: List of historical transactions (max 10,000)
    
    This endpoint trains the anomaly detector and builds the wallet graph
    """
    try:
        # Convert to dicts
        transactions = [tx.dict() for tx in request.transactions]
        
        # Train engine
        fraud_engine.train(transactions)
        
        return {
            "success": True,
            "message": f"Engine trained on {len(transactions)} transactions",
            "statistics": fraud_engine.get_statistics()
        }
    
    except Exception as e:
        logger.error(f"Training error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Training failed: {str(e)}"
        )


@app.get("/suspicious-wallets", response_model=SuspiciousWalletsResponse, tags=["Fraud Detection"])
async def get_suspicious_wallets():
    """
    Get list of suspicious wallets detected by the system
    
    Returns all wallets flagged as suspicious
    """
    wallets = fraud_engine.get_suspicious_wallets()
    
    return SuspiciousWalletsResponse(
        wallets=wallets,
        total_count=len(wallets)
    )


@app.get("/fraud-log", response_model=FraudLogResponse, tags=["Fraud Detection"])
async def get_fraud_log(limit: int = 100):
    """
    Get fraud detection log
    
    - **limit**: Maximum number of entries to return (default: 100)
    
    Returns recent fraud detection events
    """
    log_entries = fraud_engine.get_fraud_log(limit=limit)
    
    return FraudLogResponse(
        log_entries=log_entries,
        total_entries=len(log_entries)
    )


@app.get("/statistics", response_model=StatisticsResponse, tags=["Statistics"])
async def get_statistics():
    """
    Get fraud detection statistics
    
    Returns overall system statistics
    """
    stats = fraud_engine.get_statistics()
    
    return StatisticsResponse(**stats)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

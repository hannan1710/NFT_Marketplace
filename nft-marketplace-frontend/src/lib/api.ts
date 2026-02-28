import axios from 'axios';

// API Client instances
const validatorAPI = axios.create({
  baseURL: process.env.NEXT_PUBLIC_VALIDATOR_API_URL,
  timeout: 10000,
});

const pricePredictorAPI = axios.create({
  baseURL: process.env.NEXT_PUBLIC_PRICE_PREDICTOR_API_URL,
  timeout: 10000,
});

const fraudDetectorAPI = axios.create({
  baseURL: process.env.NEXT_PUBLIC_FRAUD_DETECTOR_API_URL,
  timeout: 10000,
});

const trustScoreAPI = axios.create({
  baseURL: process.env.NEXT_PUBLIC_TRUST_SCORE_API_URL,
  timeout: 10000,
});

const eventOrchestratorAPI = axios.create({
  baseURL: process.env.NEXT_PUBLIC_EVENT_ORCHESTRATOR_API_URL,
  timeout: 10000,
});

// Types
export interface PricePrediction {
  predicted_price: number;
  confidence: number;
}

export interface FraudAnalysis {
  risk_score: number;
  risk_category: 'Low' | 'Medium' | 'High';
  flags: string[];
  fraud_detected: boolean;
}

export interface TrustScore {
  walletAddress: string;
  trustScore: number;
  trustLevel: string;
  factors: {
    transactionHistory: number;
    disputeHistory: number;
    accountAge: number;
    fraudRiskHistory: number;
    behavioralConsistency: number;
  };
  lastUpdated: string;
}

export interface SecurityReport {
  contractAddress: string;
  vulnerabilities: Array<{
    type: string;
    severity: 'Low' | 'Medium' | 'High';
    description: string;
    location: string;
  }>;
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
}

// API Functions
export const api = {
  // Price Prediction
  async predictPrice(data: {
    rarity_score: number;
    creator_volume: number;
    demand_index: number;
    price_trend: number;
  }): Promise<PricePrediction> {
    const response = await pricePredictorAPI.post('/predict', data);
    return response.data;
  },

  // Fraud Detection
  async analyzeFraud(transaction: {
    transaction_id: string;
    nft_id: string;
    seller: string;
    buyer: string;
    price: number;
    timestamp: number;
  }): Promise<FraudAnalysis> {
    const response = await fraudDetectorAPI.post('/risk-score', { transaction });
    return response.data;
  },

  async analyzeWallet(walletAddress: string): Promise<any> {
    const response = await fraudDetectorAPI.post('/analyze-wallet', { wallet_address: walletAddress });
    return response.data;
  },

  // Trust Score
  async getTrustScore(walletAddress: string): Promise<TrustScore> {
    const response = await trustScoreAPI.get(`/api/trust-score/${walletAddress}`);
    return response.data.data;
  },

  async updateTrustScore(walletAddress: string, transactionData: any): Promise<TrustScore> {
    const response = await trustScoreAPI.post(`/api/trust-score/${walletAddress}/transaction`, transactionData);
    return response.data.data;
  },

  // Contract Validation
  async validateContract(contractCode: string): Promise<SecurityReport> {
    const response = await validatorAPI.post('/api/analyze-contract', { 
      sourceCode: contractCode,
      contractName: 'UserContract'
    });
    return response.data.data;
  },

  // Event Orchestrator
  async getEventsByToken(tokenId: string): Promise<any> {
    const response = await eventOrchestratorAPI.get(`/api/events/token/${tokenId}`);
    return response.data;
  },

  async getEventsByWallet(address: string): Promise<any> {
    const response = await eventOrchestratorAPI.get(`/api/events/wallet/${address}`);
    return response.data;
  },

  async getEventStats(): Promise<any> {
    const response = await eventOrchestratorAPI.get('/api/events/stats');
    return response.data;
  },
};

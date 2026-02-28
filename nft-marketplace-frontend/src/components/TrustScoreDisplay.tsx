'use client';

import { useEffect, useState } from 'react';
import { api, TrustScore } from '@/lib/api';
import { Shield, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface TrustScoreDisplayProps {
  walletAddress: string;
  showDetails?: boolean;
}

export function TrustScoreDisplay({ walletAddress, showDetails = false }: TrustScoreDisplayProps) {
  const [trustData, setTrustData] = useState<TrustScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrustScore = async () => {
      try {
        const data = await api.getTrustScore(walletAddress);
        setTrustData(data);
      } catch (error) {
        console.error('Failed to fetch trust score:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrustScore();
  }, [walletAddress]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-20 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (!trustData) {
    return (
      <div className="card bg-gray-50">
        <div className="flex items-center space-x-2 text-gray-600">
          <AlertCircle className="w-5 h-5" />
          <span>Trust score unavailable</span>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success-600';
    if (score >= 60) return 'text-primary-600';
    if (score >= 40) return 'text-warning-600';
    return 'text-danger-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-success-100';
    if (score >= 60) return 'bg-primary-100';
    if (score >= 40) return 'bg-warning-100';
    return 'bg-danger-100';
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Shield className={`w-6 h-6 ${getScoreColor(trustData.trustScore)}`} />
          <h3 className="text-lg font-bold text-gray-900">Trust Score</h3>
        </div>
        <div className={`text-3xl font-bold ${getScoreColor(trustData.trustScore)}`}>
          {trustData.trustScore}
          <span className="text-lg text-gray-500">/100</span>
        </div>
      </div>

      {/* Trust Level Badge */}
      <div className="mb-4">
        <span className={`badge ${getScoreBackground(trustData.trustScore)} ${getScoreColor(trustData.trustScore)}`}>
          {trustData.trustLevel}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${
            trustData.trustScore >= 80 ? 'bg-success-600' :
            trustData.trustScore >= 60 ? 'bg-primary-600' :
            trustData.trustScore >= 40 ? 'bg-warning-600' :
            'bg-danger-600'
          }`}
          style={{ width: `${trustData.trustScore}%` }}
        ></div>
      </div>

      {/* Detailed Factors */}
      {showDetails && trustData.factors && (
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700">Score Breakdown</h4>
          
          <div className="space-y-2">
            <FactorBar
              label="Transaction History"
              value={trustData.factors.transactionHistory}
              weight={25}
            />
            <FactorBar
              label="Dispute History"
              value={trustData.factors.disputeHistory}
              weight={20}
            />
            <FactorBar
              label="Account Age"
              value={trustData.factors.accountAge}
              weight={15}
            />
            <FactorBar
              label="Fraud Risk"
              value={trustData.factors.fraudRiskHistory}
              weight={25}
            />
            <FactorBar
              label="Behavioral Consistency"
              value={trustData.factors.behavioralConsistency}
              weight={15}
            />
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Last updated: {new Date(trustData.lastUpdated).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

function FactorBar({ label, value, weight }: { label: string; value: number; weight: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-900 font-medium">{value.toFixed(1)} ({weight}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-primary-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${value}%` }}
        ></div>
      </div>
    </div>
  );
}

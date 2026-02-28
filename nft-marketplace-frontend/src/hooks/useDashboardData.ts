'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWatchContractEvent } from 'wagmi';
import { NFT_CONTRACT_ADDRESS, MARKETPLACE_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, MARKETPLACE_CONTRACT_ABI } from '@/config/contracts';
import { api } from '@/lib/api';
import { formatEther } from 'viem';

export interface DashboardStats {
  ownedNFTs: number;
  portfolioValue: string;
  totalTransactions: number;
  avgROI: string;
  recentEvents: any[];
  trustScore: number;
  fraudRiskLevel: string;
}

export function useDashboardData() {
  const { address, isConnected } = useAccount();
  const [stats, setStats] = useState<DashboardStats>({
    ownedNFTs: 0,
    portfolioValue: '0',
    totalTransactions: 0,
    avgROI: '0',
    recentEvents: [],
    trustScore: 0,
    fraudRiskLevel: 'Low',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Read NFT balance from contract
  const { data: nftBalance, refetch: refetchBalance } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_CONTRACT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Read total supply
  const { data: totalSupply } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_CONTRACT_ABI,
    functionName: 'totalSupply',
  });

  // Fetch backend data
  const fetchBackendData = useCallback(async () => {
    if (!address) return;

    try {
      setLoading(true);
      const [events, trustScoreData] = await Promise.all([
        api.getEventsByWallet(address).catch(() => ({ data: [] })),
        api.getTrustScore(address).catch(() => ({ trustScore: 0, trustLevel: 'Unknown' })),
      ]);

      const eventData = events.data || [];
      
      setStats(prev => ({
        ...prev,
        totalTransactions: eventData.length,
        recentEvents: eventData.slice(0, 10),
        trustScore: trustScoreData.trustScore || 0,
        fraudRiskLevel: trustScoreData.trustLevel || 'Unknown',
      }));
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Update NFT balance when it changes
  useEffect(() => {
    if (nftBalance !== undefined) {
      setStats(prev => ({
        ...prev,
        ownedNFTs: Number(nftBalance),
      }));
    }
  }, [nftBalance]);

  // Fetch backend data on mount and address change
  useEffect(() => {
    if (address) {
      fetchBackendData();
    }
  }, [address, fetchBackendData]);

  // Watch for NFT Transfer events (minting/transfers to user)
  useWatchContractEvent({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_CONTRACT_ABI,
    eventName: 'Transfer',
    onLogs: (logs) => {
      logs.forEach((log: any) => {
        if (log.args.to === address || log.args.from === address) {
          // Refetch balance when user receives or sends NFT
          refetchBalance();
          fetchBackendData();
        }
      });
    },
  });

  // Watch for Marketplace ListingPurchased events
  useWatchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MARKETPLACE_CONTRACT_ABI,
    eventName: 'ListingPurchased',
    onLogs: (logs) => {
      logs.forEach((log: any) => {
        if (log.args.buyer === address) {
          // User purchased something
          refetchBalance();
          fetchBackendData();
        }
      });
    },
  });

  // Watch for Auction events
  useWatchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MARKETPLACE_CONTRACT_ABI,
    eventName: 'AuctionFinalized',
    onLogs: (logs) => {
      logs.forEach((log: any) => {
        if (log.args.winner === address) {
          // User won auction
          refetchBalance();
          fetchBackendData();
        }
      });
    },
  });

  const refresh = useCallback(() => {
    refetchBalance();
    fetchBackendData();
  }, [refetchBalance, fetchBackendData]);

  return {
    stats,
    loading,
    error,
    refresh,
    isConnected,
  };
}

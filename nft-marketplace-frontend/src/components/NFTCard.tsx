'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useNFTMetadata } from '@/hooks/useNFTMetadata';
import { api } from '@/lib/api';
import { Shield, TrendingUp, AlertTriangle, ShoppingCart } from 'lucide-react';
import { formatEther } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MARKETPLACE_CONTRACT_ADDRESS, MARKETPLACE_CONTRACT_ABI } from '@/config/contracts';
import toast from 'react-hot-toast';

interface NFTCardProps {
  tokenId: string;
  tokenURI: string;
  price?: bigint;
  seller?: string;
  listingId?: string;
  showAnalytics?: boolean;
}

export function NFTCard({ tokenId, tokenURI, price, seller, listingId, showAnalytics = true }: NFTCardProps) {
  const { metadata, loading } = useNFTMetadata(tokenURI);
  const [priceData, setPriceData] = useState<{ predicted_price: number; confidence: number } | null>(null);
  const [fraudData, setFraudData] = useState<{ risk_score: number; risk_category: string } | null>(null);
  const [trustScore, setTrustScore] = useState<number | null>(null);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleBuyNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!listingId || !price) {
      toast.error('Invalid listing');
      return;
    }

    try {
      writeContract({
        address: MARKETPLACE_CONTRACT_ADDRESS,
        abi: MARKETPLACE_CONTRACT_ABI,
        functionName: 'purchaseListing',
        args: [BigInt(listingId)],
        value: price,
      });
      toast.loading('Purchasing NFT...');
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to purchase NFT');
    }
  };

  useEffect(() => {
    if (isSuccess) {
      toast.dismiss();
      toast.success('NFT purchased successfully!');
    }
  }, [isSuccess]);

  useEffect(() => {
    if (!showAnalytics || !seller) return;

    const fetchAnalytics = async () => {
      try {
        // Fetch price prediction
        const priceResult = await api.predictPrice({
          rarity_score: 75,
          creator_volume: 50000,
          demand_index: 80,
          price_trend: price ? Number(formatEther(price)) : 1000,
        });
        setPriceData(priceResult);

        // Fetch trust score
        const trustResult = await api.getTrustScore(seller);
        setTrustScore(trustResult.trustScore);

        // Fetch fraud analysis if there's a price
        if (price) {
          const fraudResult = await api.analyzeFraud({
            transaction_id: `${tokenId}-${Date.now()}`,
            nft_id: tokenId,
            seller: seller,
            buyer: '0x0000000000000000000000000000000000000000',
            price: Number(formatEther(price)),
            timestamp: Math.floor(Date.now() / 1000),
          });
          setFraudData(fraudResult);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      }
    };

    fetchAnalytics();
  }, [tokenId, seller, price, showAnalytics]);

  const getRiskColor = (category: string) => {
    switch (category) {
      case 'Low': return 'text-success-600 bg-success-50';
      case 'Medium': return 'text-warning-600 bg-warning-50';
      case 'High': return 'text-danger-600 bg-danger-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTrustColor = (score: number) => {
    if (score >= 80) return 'text-success-600 bg-success-50';
    if (score >= 60) return 'text-primary-600 bg-primary-50';
    if (score >= 40) return 'text-warning-600 bg-warning-50';
    return 'text-danger-600 bg-danger-50';
  };

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="w-full h-64 bg-gray-200 rounded-lg mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  const imageUrl = metadata?.image?.startsWith('ipfs://')
    ? metadata.image.replace('ipfs://', process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/')
    : metadata?.image || '/placeholder-nft.png';

  return (
    <Link href={`/nft/${tokenId}`}>
      <div className="card hover:shadow-xl transition-all duration-300 cursor-pointer group">
        {/* NFT Image */}
        <div className="relative w-full h-64 mb-4 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
          <Image
            src={imageUrl}
            alt={metadata?.name || `NFT #${tokenId}`}
            fill
            className="object-contain group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>

        {/* NFT Info */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-gray-900 truncate">
            {metadata?.name || `NFT #${tokenId}`}
          </h3>

          {price && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Price</span>
              <span className="text-lg font-bold text-primary-600">
                {Number(formatEther(price)).toFixed(3)} ETH
              </span>
            </div>
          )}

          {/* Analytics Badges */}
          {showAnalytics && (
            <div className="space-y-2 pt-2 border-t border-gray-200">
              {/* Price Prediction */}
              {priceData && (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3 text-primary-600" />
                    <span className="text-gray-600">Predicted</span>
                  </div>
                  <span className="font-semibold text-primary-600">
                    {priceData.predicted_price.toFixed(2)} ETH
                  </span>
                </div>
              )}

              {/* Fraud Risk */}
              {fraudData && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="text-xs text-gray-600">Risk</span>
                  </div>
                  <span className={`badge text-xs ${getRiskColor(fraudData.risk_category)}`}>
                    {fraudData.risk_category}
                  </span>
                </div>
              )}

              {/* Trust Score */}
              {trustScore !== null && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Shield className="w-3 h-3" />
                    <span className="text-xs text-gray-600">Trust</span>
                  </div>
                  <span className={`badge text-xs ${getTrustColor(trustScore)}`}>
                    {trustScore}/100
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Buy Button */}
          {price && listingId && (
            <button
              onClick={handleBuyNow}
              disabled={isPending || isConfirming}
              className="w-full btn-primary mt-3 flex items-center justify-center space-x-2"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{isPending || isConfirming ? 'Buying...' : 'Buy Now'}</span>
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}

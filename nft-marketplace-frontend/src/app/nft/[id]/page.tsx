'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Navbar } from '@/components/Navbar';
import { useNFTMetadata } from '@/hooks/useNFTMetadata';
import { api } from '@/lib/api';
import { NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, MARKETPLACE_CONTRACT_ADDRESS, MARKETPLACE_CONTRACT_ABI } from '@/config/contracts';
import { ShoppingCart, Tag, Clock, AlertTriangle, TrendingUp, Shield, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

// Lazy load heavy components
const TrustScoreDisplay = dynamic(() => import('@/components/TrustScoreDisplay').then(mod => ({ default: mod.TrustScoreDisplay })), {
  loading: () => <div className="card h-64 animate-pulse bg-gray-200 dark:bg-gray-700"></div>,
  ssr: false
});

const PricePredictionChart = dynamic(() => import('@/components/PricePredictionChart').then(mod => ({ default: mod.PricePredictionChart })), {
  loading: () => <div className="card h-64 animate-pulse bg-gray-200 dark:bg-gray-700"></div>,
  ssr: false
});

export default function NFTDetailPage() {
  const params = useParams();
  const tokenId = params.id as string;
  const { address, isConnected } = useAccount();
  const [fraudData, setFraudData] = useState<any>(null);
  const [priceData, setPriceData] = useState<any>(null);
  const [listingData, setListingData] = useState<any>(null);
  const [loadingListing, setLoadingListing] = useState(true);

  // Fetch token URI
  const { data: tokenURI } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_CONTRACT_ABI,
    functionName: 'tokenURI',
    args: [BigInt(tokenId)],
  });

  // Fetch owner
  const { data: owner } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_CONTRACT_ABI,
    functionName: 'ownerOf',
    args: [BigInt(tokenId)],
  });

  // Fetch royalty info
  const { data: royaltyInfo } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_CONTRACT_ABI,
    functionName: 'royaltyInfo',
    args: [BigInt(tokenId), parseEther('1')],
  });

  const { metadata, loading } = useNFTMetadata(tokenURI as string);

  // Fetch listing data
  useEffect(() => {
    const fetchListing = async () => {
      try {
        setLoadingListing(true);
        const response = await fetch(`http://127.0.0.1:8545`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{
              to: MARKETPLACE_CONTRACT_ADDRESS,
              data: `0x107a274a${tokenId.toString().padStart(64, '0')}` // getListing(uint256)
            }, 'latest'],
            id: 1
          })
        });
        
        // For now, check if there's a listing by searching through all listings
        const totalResponse = await fetch(`http://127.0.0.1:8545`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{
              to: MARKETPLACE_CONTRACT_ADDRESS,
              data: '0x7b1b769e' // getTotalListings()
            }, 'latest'],
            id: 1
          })
        });
        
        const totalData = await totalResponse.json();
        const total = parseInt(totalData.result, 16);
        
        // Search through listings to find one for this tokenId
        for (let i = 0; i < total; i++) {
          const listingResponse = await fetch(`http://127.0.0.1:8545`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_call',
              params: [{
                to: MARKETPLACE_CONTRACT_ADDRESS,
                data: `0x107a274a${i.toString(16).padStart(64, '0')}` // getListing(uint256)
              }, 'latest'],
              id: 1
            })
          });
          
          const listingResult = await listingResponse.json();
          if (listingResult.result && listingResult.result !== '0x') {
            // Parse the result (nftContract, tokenId, seller, price, active)
            const data = listingResult.result.slice(2);
            const listingTokenId = parseInt(data.slice(64, 128), 16);
            const active = parseInt(data.slice(256, 320), 16) === 1;
            
            if (listingTokenId === parseInt(tokenId) && active) {
              const price = BigInt('0x' + data.slice(192, 256));
              setListingData({
                listingId: i,
                price: price,
                seller: '0x' + data.slice(24, 64),
                active: true
              });
              break;
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch listing:', error);
      } finally {
        setLoadingListing(false);
      }
    };
    
    if (tokenId) {
      fetchListing();
    }
  }, [tokenId]);

  // Purchase listing
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isPurchasing, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch price prediction
        const price = await api.predictPrice({
          rarity_score: 75,
          creator_volume: 50000,
          demand_index: 80,
          price_trend: 1500,
        });
        setPriceData(price);

        // Fetch fraud analysis
        if (owner) {
          const fraud = await api.analyzeFraud({
            transaction_id: `${tokenId}-${Date.now()}`,
            nft_id: tokenId,
            seller: owner as string,
            buyer: '0x0000000000000000000000000000000000000000',
            price: 1.5,
            timestamp: Math.floor(Date.now() / 1000),
          });
          setFraudData(fraud);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      }
    };

    fetchAnalytics();
  }, [tokenId, owner]);

  const handlePurchase = async (listingId: string, price: bigint) => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
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
    } catch (error) {
      toast.error('Purchase failed');
      console.error(error);
    }
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success('NFT purchased successfully!');
    }
  }, [isSuccess]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const imageUrl = metadata?.image?.startsWith('ipfs://')
    ? metadata.image.replace('ipfs://', process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs/')
    : metadata?.image || '/placeholder-nft.png';

  const hasListing = listingData && listingData.active;
  const price = hasListing ? listingData.price : parseEther('0');
  const listingId = hasListing ? listingData.listingId.toString() : '0';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* NFT Image */}
          <div className="card">
            <div className="relative w-full h-96 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
              <Image
                src={imageUrl}
                alt={metadata?.name || `NFT #${tokenId}`}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            </div>

            {/* Attributes */}
            {metadata?.attributes && metadata.attributes.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Attributes</h3>
                <div className="grid grid-cols-2 gap-3">
                  {metadata.attributes.map((attr, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{attr.trait_type}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{attr.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* NFT Details */}
          <div className="space-y-6">
            <div className="card">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {metadata?.name || `NFT #${tokenId}`}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">{metadata?.description}</p>

              {/* Price */}
              {hasListing ? (
                <div className="bg-primary-50 dark:bg-primary-950 p-6 rounded-xl mb-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Current Price</p>
                  <p className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-4">
                    {Number(formatEther(price)).toFixed(3)} ETH
                  </p>
                  <button
                    onClick={() => handlePurchase(listingId, price)}
                    disabled={isPurchasing || !isConnected}
                    className="btn-primary w-full"
                  >
                    <ShoppingCart className="w-5 h-5 inline mr-2" />
                    {isPurchasing ? 'Processing...' : 'Buy Now'}
                  </button>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl mb-6">
                  <p className="text-gray-600 dark:text-gray-400 text-center mb-4">Not listed for sale</p>
                  
                  {/* Show listing options if user owns the NFT */}
                  {address && owner && (address.toLowerCase() === (owner as string).toLowerCase()) && (
                    <div className="space-y-3">
                      <a
                        href={`/marketplace/list/${tokenId}`}
                        className="btn-primary w-full flex items-center justify-center"
                      >
                        <Tag className="w-5 h-5 mr-2" />
                        List for Sale
                      </a>
                      <a
                        href={`/marketplace/auction/${tokenId}`}
                        className="btn-secondary w-full flex items-center justify-center"
                      >
                        <Clock className="w-5 h-5 mr-2" />
                        Create Auction
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Owner Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Owner</span>
                  <a
                    href={`https://etherscan.io/address/${owner}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center space-x-1"
                  >
                    <span>{owner ? `${(owner as string).slice(0, 6)}...${(owner as string).slice(-4)}` : 'Unknown'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Token ID</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">#{tokenId}</span>
                </div>

                {royaltyInfo && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Royalty</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {((Number(royaltyInfo[1]) / 10000) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Fraud Risk Badge */}
            {fraudData && (
              <div className={`card ${
                fraudData.risk_category === 'Low' ? 'bg-success-50 dark:bg-success-950 border-success-200 dark:border-success-800' :
                fraudData.risk_category === 'Medium' ? 'bg-warning-50 dark:bg-warning-950 border-warning-200 dark:border-warning-800' :
                'bg-danger-50 dark:bg-danger-950 border-danger-200 dark:border-danger-800'
              }`}>
                <div className="flex items-center space-x-3">
                  <AlertTriangle className={`w-6 h-6 ${
                    fraudData.risk_category === 'Low' ? 'text-success-600 dark:text-success-400' :
                    fraudData.risk_category === 'Medium' ? 'text-warning-600 dark:text-warning-400' :
                    'text-danger-600 dark:text-danger-400'
                  }`} />
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">Fraud Risk: {fraudData.risk_category}</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Risk Score: {fraudData.risk_score.toFixed(1)}/100
                    </p>
                    {fraudData.flags && fraudData.flags.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Flags:</p>
                        <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                          {fraudData.flags.map((flag: string, i: number) => (
                            <li key={i}>• {flag}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Price Prediction */}
          {priceData && hasListing && (
            <PricePredictionChart
              currentPrice={Number(formatEther(price))}
              predictedPrice={priceData.predicted_price}
              confidence={priceData.confidence}
            />
          )}

          {/* Trust Score */}
          {owner && (
            <TrustScoreDisplay walletAddress={owner as string} showDetails={true} />
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useAccount, useReadContract } from 'wagmi';
import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI } from '@/config/contracts';
import { Package, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function MyNFTsPage() {
  const { address, isConnected } = useAccount();
  const [nfts, setNfts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Get user's NFT balance
  const { data: balance } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_CONTRACT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Get total supply to know how many NFTs exist
  const { data: totalSupply } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_CONTRACT_ABI,
    functionName: 'totalSupply',
  });

  useEffect(() => {
    const fetchNFTs = async () => {
      if (!address || !totalSupply) return;

      setLoading(true);
      const userNFTs = [];

      // Check each token ID to see if user owns it
      for (let i = 0; i < Number(totalSupply); i++) {
        try {
          const response = await fetch(`/api/nft/${i}`);
          if (response.ok) {
            const data = await response.json();
            if (data.owner?.toLowerCase() === address.toLowerCase()) {
              userNFTs.push({ tokenId: i, ...data });
            }
          }
        } catch (error) {
          console.error(`Error fetching NFT ${i}:`, error);
        }
      }

      setNfts(userNFTs);
      setLoading(false);
    };

    fetchNFTs();
  }, [address, totalSupply]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <Package className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to view your NFTs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">My NFTs</h1>
          <p className="text-gray-600 dark:text-gray-300">
            You own {balance?.toString() || '0'} NFT{balance !== 1n ? 's' : ''}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading your NFTs...</span>
          </div>
        ) : nfts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {nfts.map((nft) => (
              <Link key={nft.tokenId} href={`/nft/${nft.tokenId}`}>
                <div className="card hover:shadow-xl transition-all duration-300 cursor-pointer group">
                  {/* NFT Image */}
                  <div className="relative w-full h-64 mb-4 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {nft.metadata?.image ? (
                      <Image
                        src={nft.metadata.image}
                        alt={nft.metadata?.name || `NFT #${nft.tokenId}`}
                        fill
                        className="object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* NFT Info */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                      {nft.metadata?.name || `NFT #${nft.tokenId}`}
                    </h3>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {nft.metadata?.description || 'No description'}
                    </p>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Token ID: {nft.tokenId}
                      </span>
                      <button className="btn-primary text-xs py-1 px-3">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No NFTs Yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You don't own any NFTs yet. Create or buy your first NFT!
            </p>
            <div className="flex justify-center space-x-4">
              <Link href="/create" className="btn-primary">
                Create NFT
              </Link>
              <Link href="/marketplace" className="btn-secondary">
                Browse Marketplace
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

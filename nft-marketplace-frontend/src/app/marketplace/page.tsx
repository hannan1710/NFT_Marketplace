'use client';

import { useState, useEffect } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { Navbar } from '@/components/Navbar';
import { NFTCard } from '@/components/NFTCard';
import { MARKETPLACE_CONTRACT_ADDRESS, NFT_CONTRACT_ADDRESS } from '@/config/contracts';
import { Search, Grid, List, RefreshCw } from 'lucide-react';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { hardhat } from 'viem/chains';
import { useRealtimeListings } from '@/hooks/useRealtimeListings';

const client = createPublicClient({
  chain: hardhat,
  transport: http('http://127.0.0.1:8545'),
});

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { address } = useAccount();
  
  // Use real-time listings hook
  const { listings, loading, refresh } = useRealtimeListings();

  const floorPrice = listings.length > 0 
    ? Math.min(...listings.map(l => Number(l.price) / 1e18)).toFixed(3)
    : '0';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Refresh */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Marketplace</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Discover, collect, and trade unique NFTs with AI-powered insights
            </p>
          </div>
          <button
            onClick={refresh}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats with Real-time Badge */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Listings</p>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Live</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {listings.length}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Auctions</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">0</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Floor Price</p>
            <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
              {floorPrice} ETH
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="card mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search NFTs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-600 dark:text-gray-400'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-600 dark:text-gray-400'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* NFT Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading listings...</p>
          </div>
        ) : listings.length > 0 ? (
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-6`}>
            {listings.map((listing) => (
              <div key={listing.listingId}>
                <NFTCard
                  tokenId={listing.tokenId.toString()}
                  tokenURI={`ipfs://QmExample${listing.tokenId}`}
                  price={listing.price}
                  seller={listing.seller}
                  listingId={listing.listingId.toString()}
                  showAnalytics={true}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">No listings available yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Be the first to list an NFT on the marketplace!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

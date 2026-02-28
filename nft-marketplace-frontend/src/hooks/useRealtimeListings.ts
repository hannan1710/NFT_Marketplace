'use client';

import { useState, useEffect, useCallback } from 'react';
import { useReadContract, useWatchContractEvent } from 'wagmi';
import { MARKETPLACE_CONTRACT_ADDRESS, MARKETPLACE_CONTRACT_ABI } from '@/config/contracts';
import { formatEther } from 'viem';

export interface Listing {
  listingId: bigint;
  nftContract: string;
  tokenId: bigint;
  seller: string;
  price: bigint;
  active: boolean;
}

export function useRealtimeListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Get total listings count
  const { data: totalListings, refetch: refetchTotal } = useReadContract({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MARKETPLACE_CONTRACT_ABI,
    functionName: 'getTotalListings',
  });

  // Fetch all active listings
  const fetchListings = useCallback(async () => {
    setLoading(true);
    
    if (!totalListings || Number(totalListings) === 0) {
      setListings([]);
      setLoading(false);
      return;
    }

    const listingsData: Listing[] = [];
    
    try {
      // Fetch each listing (this is simplified - in production you'd batch this)
      for (let i = 0; i < Number(totalListings); i++) {
        try {
          const listing = await fetch(`/api/marketplace/listing/${i}`).then(r => r.json());
          if (listing && listing.active) {
            listingsData.push(listing);
          }
        } catch (err) {
          console.error(`Failed to fetch listing ${i}:`, err);
        }
      }
      
      setListings(listingsData);
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    } finally {
      setLoading(false);
    }
  }, [totalListings]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Watch for new listings
  useWatchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MARKETPLACE_CONTRACT_ABI,
    eventName: 'ListingCreated',
    onLogs: (logs) => {
      logs.forEach((log: any) => {
        const newListing: Listing = {
          listingId: log.args.listingId,
          nftContract: log.args.nftContract,
          tokenId: log.args.tokenId,
          seller: log.args.seller,
          price: log.args.price,
          active: true,
        };
        
        setListings(prev => [...prev, newListing]);
      });
      refetchTotal();
    },
  });

  // Watch for listing purchases
  useWatchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MARKETPLACE_CONTRACT_ABI,
    eventName: 'ListingPurchased',
    onLogs: (logs) => {
      logs.forEach((log: any) => {
        setListings(prev => 
          prev.map(listing => 
            listing.listingId === log.args.listingId
              ? { ...listing, active: false }
              : listing
          ).filter(l => l.active)
        );
      });
    },
  });

  // Watch for listing cancellations
  useWatchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MARKETPLACE_CONTRACT_ABI,
    eventName: 'ListingCancelled',
    onLogs: (logs) => {
      logs.forEach((log: any) => {
        setListings(prev => 
          prev.filter(listing => listing.listingId !== log.args.listingId)
        );
      });
    },
  });

  // Watch for price updates
  useWatchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MARKETPLACE_CONTRACT_ABI,
    eventName: 'ListingPriceUpdated',
    onLogs: (logs) => {
      logs.forEach((log: any) => {
        setListings(prev => 
          prev.map(listing => 
            listing.listingId === log.args.listingId
              ? { ...listing, price: log.args.newPrice }
              : listing
          )
        );
      });
    },
  });

  return {
    listings,
    loading,
    refresh: fetchListings,
  };
}

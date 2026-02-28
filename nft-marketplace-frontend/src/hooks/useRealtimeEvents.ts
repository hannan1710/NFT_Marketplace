'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWatchContractEvent } from 'wagmi';
import { NFT_CONTRACT_ADDRESS, MARKETPLACE_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, MARKETPLACE_CONTRACT_ABI } from '@/config/contracts';

export interface BlockchainEvent {
  id: string;
  type: 'NFTMinted' | 'NFTTransferred' | 'ListingCreated' | 'ListingPurchased' | 'AuctionCreated' | 'BidPlaced' | 'AuctionFinalized';
  timestamp: number;
  blockNumber: bigint;
  transactionHash: string;
  data: any;
}

export function useRealtimeEvents(walletAddress?: string) {
  const [events, setEvents] = useState<BlockchainEvent[]>([]);
  const [eventCount, setEventCount] = useState(0);

  const addEvent = useCallback((event: BlockchainEvent) => {
    setEvents(prev => [event, ...prev].slice(0, 50)); // Keep last 50 events
    setEventCount(prev => prev + 1);
  }, []);

  // Watch NFT Transfer events (minting and transfers)
  useWatchContractEvent({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_CONTRACT_ABI,
    eventName: 'Transfer',
    onLogs: (logs) => {
      logs.forEach((log: any) => {
        // Filter by wallet if specified
        if (walletAddress && log.args.to !== walletAddress && log.args.from !== walletAddress) {
          return;
        }

        const isMint = log.args.from === '0x0000000000000000000000000000000000000000';
        
        addEvent({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: isMint ? 'NFTMinted' : 'NFTTransferred',
          timestamp: Date.now(),
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          data: {
            from: log.args.from,
            to: log.args.to,
            tokenId: log.args.tokenId?.toString(),
          },
        });
      });
    },
  });

  // Watch Marketplace ListingCreated events
  useWatchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MARKETPLACE_CONTRACT_ABI,
    eventName: 'ListingCreated',
    onLogs: (logs) => {
      logs.forEach((log: any) => {
        if (walletAddress && log.args.seller !== walletAddress) {
          return;
        }

        addEvent({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'ListingCreated',
          timestamp: Date.now(),
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          data: {
            listingId: log.args.listingId?.toString(),
            nftContract: log.args.nftContract,
            tokenId: log.args.tokenId?.toString(),
            seller: log.args.seller,
            price: log.args.price?.toString(),
          },
        });
      });
    },
  });

  // Watch Marketplace ListingPurchased events
  useWatchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MARKETPLACE_CONTRACT_ABI,
    eventName: 'ListingPurchased',
    onLogs: (logs) => {
      logs.forEach((log: any) => {
        if (walletAddress && log.args.buyer !== walletAddress) {
          return;
        }

        addEvent({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'ListingPurchased',
          timestamp: Date.now(),
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          data: {
            listingId: log.args.listingId?.toString(),
            buyer: log.args.buyer,
            price: log.args.price?.toString(),
          },
        });
      });
    },
  });

  // Watch Marketplace AuctionCreated events
  useWatchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MARKETPLACE_CONTRACT_ABI,
    eventName: 'AuctionCreated',
    onLogs: (logs) => {
      logs.forEach((log: any) => {
        if (walletAddress && log.args.seller !== walletAddress) {
          return;
        }

        addEvent({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'AuctionCreated',
          timestamp: Date.now(),
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          data: {
            auctionId: log.args.auctionId?.toString(),
            nftContract: log.args.nftContract,
            tokenId: log.args.tokenId?.toString(),
            seller: log.args.seller,
            startPrice: log.args.startPrice?.toString(),
            endTime: log.args.endTime?.toString(),
          },
        });
      });
    },
  });

  // Watch Marketplace BidPlaced events
  useWatchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MARKETPLACE_CONTRACT_ABI,
    eventName: 'BidPlaced',
    onLogs: (logs) => {
      logs.forEach((log: any) => {
        if (walletAddress && log.args.bidder !== walletAddress) {
          return;
        }

        addEvent({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'BidPlaced',
          timestamp: Date.now(),
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          data: {
            auctionId: log.args.auctionId?.toString(),
            bidder: log.args.bidder,
            amount: log.args.amount?.toString(),
          },
        });
      });
    },
  });

  // Watch Marketplace AuctionFinalized events
  useWatchContractEvent({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MARKETPLACE_CONTRACT_ABI,
    eventName: 'AuctionFinalized',
    onLogs: (logs) => {
      logs.forEach((log: any) => {
        if (walletAddress && log.args.winner !== walletAddress) {
          return;
        }

        addEvent({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'AuctionFinalized',
          timestamp: Date.now(),
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          data: {
            auctionId: log.args.auctionId?.toString(),
            winner: log.args.winner,
            amount: log.args.amount?.toString(),
          },
        });
      });
    },
  });

  const clearEvents = useCallback(() => {
    setEvents([]);
    setEventCount(0);
  }, []);

  return {
    events,
    eventCount,
    clearEvents,
  };
}

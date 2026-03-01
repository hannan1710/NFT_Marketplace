'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import Image from 'next/image';
import { Navbar } from '@/components/Navbar';
import { NFT_CONTRACT_ADDRESS, MARKETPLACE_CONTRACT_ADDRESS, MARKETPLACE_CONTRACT_ABI } from '@/config/contracts';
import { Tag, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const APPROVE_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  }
] as const;

export default function ListNFTPage() {
  const params = useParams();
  const router = useRouter();
  const tokenId = params.tokenId as string;
  const { address, isConnected } = useAccount();
  const [price, setPrice] = useState('');
  const [metadata, setMetadata] = useState<any>(null);
  const [isApproved, setIsApproved] = useState(false);

  // Fetch NFT metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch(`/api/nft/${tokenId}`);
        if (response.ok) {
          const data = await response.json();
          setMetadata(data.metadata);
        }
      } catch (error) {
        console.error('Failed to fetch metadata:', error);
      }
    };
    fetchMetadata();
  }, [tokenId]);

  // Approve marketplace
  const { writeContract: approve, data: approveHash } = useWriteContract();
  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  useEffect(() => {
    if (approveSuccess) {
      setIsApproved(true);
      toast.success('Marketplace approved!');
    }
  }, [approveSuccess]);

  // Create listing
  const { writeContract: createListing, data: listingHash } = useWriteContract();
  const { isLoading: isListing, isSuccess } = useWaitForTransactionReceipt({ hash: listingHash });

  useEffect(() => {
    if (isSuccess) {
      toast.success('NFT listed successfully!');
      setTimeout(() => router.push('/marketplace'), 2000);
    }
  }, [isSuccess, router]);

  const handleApprove = () => {
    // @ts-expect-error - wagmi writeContract type mismatch
    approve({
      address: NFT_CONTRACT_ADDRESS,
      abi: APPROVE_ABI,
      functionName: 'approve',
      args: [MARKETPLACE_CONTRACT_ADDRESS, BigInt(tokenId)],
    });
  };

  const handleList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!price || parseFloat(price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    // @ts-expect-error - wagmi writeContract type mismatch
    createListing({
      address: MARKETPLACE_CONTRACT_ADDRESS,
      abi: MARKETPLACE_CONTRACT_ABI,
      functionName: 'createListing',
      args: [NFT_CONTRACT_ADDRESS, BigInt(tokenId), parseEther(price)],
    });
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to list NFTs</p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="card text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Listed Successfully!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Your NFT is now available on the marketplace</p>
            <button onClick={() => router.push('/marketplace')} className="btn-primary">
              View in Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  const imageUrl = metadata?.image || '/placeholder-nft.png';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">List NFT for Sale</h1>
          <p className="text-gray-600 dark:text-gray-300">Set a fixed price for your NFT</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* NFT Preview */}
          <div className="card">
            <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 mb-4">
              <Image
                src={imageUrl}
                alt={metadata?.name || `NFT #${tokenId}`}
                fill
                className="object-contain"
              />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {metadata?.name || `NFT #${tokenId}`}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {metadata?.description || 'No description'}
            </p>
          </div>

          {/* Listing Form */}
          <div className="space-y-6">
            {!isApproved ? (
              <div className="card">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Step 1: Approve Marketplace</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  You need to approve the marketplace to transfer your NFT when it's sold.
                </p>
                <button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="btn-primary w-full"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Approving...
                    </>
                  ) : (
                    'Approve Marketplace'
                  )}
                </button>
              </div>
            ) : (
              <form onSubmit={handleList} className="card">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Step 2: Set Price</h3>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Price (ETH) *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.1"
                    className="input"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Buyers will pay this amount to purchase your NFT
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isListing || !price}
                  className="btn-primary w-full"
                >
                  {isListing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Listing...
                    </>
                  ) : (
                    <>
                      <Tag className="w-5 h-5 mr-2" />
                      List for Sale
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

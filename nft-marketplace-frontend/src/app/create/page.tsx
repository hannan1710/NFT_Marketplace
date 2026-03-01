'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Navbar } from '@/components/Navbar';
import { NFT_CONTRACT_ADDRESS } from '@/config/contracts';
import { Upload, Image as ImageIcon, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function CreateNFTPage() {
  const { address, isConnected } = useAccount();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    price: '',
    royalty: '5',
  });
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ 
    hash,
    onSuccess: async (data) => {
      // Get the token ID from the Transfer event
      const transferEvent = data.logs.find((log: any) => 
        log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
      );
      
      if (transferEvent) {
        // Token ID is the last topic
        const tokenId = parseInt(transferEvent.topics[3], 16);
        
        // Store metadata
        try {
          await fetch(`/api/metadata/${tokenId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formData.name,
              description: formData.description,
              image: formData.image,
            }),
          });
        } catch (err) {
          console.error('Failed to store metadata:', err);
        }
      }
    }
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    // For demo: convert to base64 (in production, upload to IPFS)
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      setFormData(prev => ({ ...prev, image: base64 }));
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleMintNFT = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) return;

    try {
      // Simple mint without metadata for now
      writeContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: [{
          inputs: [{ name: 'to', type: 'address' }],
          name: 'mint',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'nonpayable',
          type: 'function',
        }] as const,
        functionName: 'mint',
        args: [address],
      });
    } catch (err) {
      console.error('Minting failed:', err);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to create NFTs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Create NFT</h1>
          <p className="text-gray-600 dark:text-gray-300">Upload your artwork and mint it as an NFT</p>
        </div>

        {isSuccess ? (
          <div className="card text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">NFT Minted Successfully!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Your NFT has been created and added to your collection</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="btn-primary"
              >
                View in Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn-secondary"
              >
                Create Another
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleMintNFT} className="space-y-6">
            {/* Image Upload */}
            <div className="card">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-4">
                Upload Image *
              </label>
              
              {imagePreview ? (
                <div className="relative w-full">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-64 sm:h-80 md:h-96 object-contain bg-gray-100 dark:bg-gray-800 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview('');
                      setFormData(prev => ({ ...prev, image: '' }));
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {uploading ? (
                      <Loader2 className="w-12 h-12 text-gray-400 animate-spin mb-4" />
                    ) : (
                      <Upload className="w-12 h-12 text-gray-400 mb-4" />
                    )}
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            {/* NFT Details */}
            <div className="card space-y-4">
              <div>
                <label htmlFor="nft-name" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Name *
                </label>
                <input
                  id="nft-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Awesome NFT"
                  className="input"
                  required
                />
              </div>

              <div>
                <label htmlFor="nft-description" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Description *
                </label>
                <textarea
                  id="nft-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your NFT..."
                  rows={4}
                  className="input"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nft-price" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Price (ETH)
                  </label>
                  <input
                    id="nft-price"
                    type="number"
                    step="0.001"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.1"
                    className="input"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Leave empty to mint without listing
                  </p>
                </div>

                <div>
                  <label htmlFor="nft-royalty" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Royalty (%)
                  </label>
                  <input
                    id="nft-royalty"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.royalty}
                    onChange={(e) => setFormData(prev => ({ ...prev, royalty: e.target.value }))}
                    className="input"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Earn royalties on secondary sales
                  </p>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">Transaction Failed</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {error.message.includes('AccessControl') || error.message.includes('missing role') 
                        ? 'You need MINTER_ROLE to mint NFTs. Run: npx hardhat run scripts/grantAllRoles.js --network localhost'
                        : error.message.slice(0, 200)
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!formData.name || !formData.description || !formData.image || isPending || isConfirming}
              className="btn-primary w-full flex items-center justify-center"
            >
              {isPending || isConfirming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {isPending ? 'Confirm in Wallet...' : 'Minting NFT...'}
                </>
              ) : (
                <>
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Mint NFT
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

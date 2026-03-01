'use client';

import { useConnect, useAccount } from 'wagmi';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connectors, connect, error, isPending } = useConnect();
  const { isConnected } = useAccount();
  const [localError, setLocalError] = useState<string | null>(null);

  // Filter out duplicate connectors by name
  const uniqueConnectors = connectors.reduce((acc, connector) => {
    const exists = acc.find(c => c.name === connector.name);
    if (!exists) {
      acc.push(connector);
    }
    return acc;
  }, [] as typeof connectors);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setLocalError(null);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close modal when successfully connected
  useEffect(() => {
    if (isConnected && isOpen) {
      onClose();
    }
  }, [isConnected, isOpen, onClose]);

  if (!isOpen) return null;

  const handleConnect = async (connector: any) => {
    try {
      setLocalError(null);
      
      // Check if MetaMask is installed for injected connector
      if (connector.name === 'MetaMask' && typeof window !== 'undefined') {
        if (!window.ethereum) {
          setLocalError('MetaMask is not installed. Please install MetaMask extension from metamask.io');
          return;
        }
      }

      await connect({ connector });
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      setLocalError(err?.message || 'Failed to connect wallet. Please try again.');
    }
  };

  const getWalletIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('metamask')) {
      return '🦊';
    } else if (lowerName.includes('walletconnect')) {
      return '🔗';
    } else if (lowerName.includes('coinbase')) {
      return '🔵';
    }
    return '👛';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="card max-w-md w-full animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Connect Wallet
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Choose your preferred wallet to connect to SecureNFT Hub
          </p>

          {/* Error Display */}
          {(error || localError) && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                {localError || error?.message || 'Failed to connect wallet'}
              </p>
              {localError?.includes('not installed') && (
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-red-500 dark:text-red-300 underline hover:text-red-700 dark:hover:text-red-100 mt-1 inline-block"
                >
                  Download MetaMask →
                </a>
              )}
            </div>
          )}

          {/* Wallet Options */}
          <div className="space-y-3">
            {uniqueConnectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => handleConnect(connector)}
                disabled={isPending}
                className="w-full flex items-center space-x-4 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-3xl">{getWalletIcon(connector.name)}</span>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {connector.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {connector.name === 'MetaMask' && 'Connect using MetaMask browser extension'}
                    {connector.name === 'WalletConnect' && 'Scan with WalletConnect to connect'}
                    {connector.name === 'Coinbase Wallet' && 'Connect using Coinbase Wallet'}
                    {!['MetaMask', 'WalletConnect', 'Coinbase Wallet'].includes(connector.name) && 'Connect using this wallet'}
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              By connecting a wallet, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

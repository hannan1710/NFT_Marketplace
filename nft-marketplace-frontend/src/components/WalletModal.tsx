'use client';

import { useConnect } from 'wagmi';
import { X } from 'lucide-react';
import { useEffect } from 'react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connectors, connect } = useConnect();

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
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnect = (connector: any) => {
    connect({ connector });
    onClose();
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
            Choose your preferred wallet to connect to the NFT marketplace
          </p>

          {/* Wallet Options */}
          <div className="space-y-3">
            {uniqueConnectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => handleConnect(connector)}
                className="w-full flex items-center space-x-4 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-300 group"
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

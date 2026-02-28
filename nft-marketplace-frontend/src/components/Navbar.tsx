'use client';

import { useAccount, useDisconnect } from 'wagmi';
import { useRoles } from '@/hooks/useRoles';
import { useThemeSafe } from '@/hooks/useThemeSafe';
import { WalletModal } from './WalletModal';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wallet, ShoppingBag, Shield, LogOut, Sun, Moon, Sparkles, Menu, X, Package } from 'lucide-react';
import { useEffect, useState } from 'react';

export function Navbar() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { isAdmin, isMinter } = useRoles();
  const { theme, toggleTheme } = useThemeSafe();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (path: string) => pathname === path;

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="glass-effect border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 group" onClick={closeMobileMenu}>
              <div className="relative">
                <ShoppingBag className="w-8 h-8 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform duration-300" />
                <Sparkles className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 dark:from-primary-400 dark:to-purple-400 bg-clip-text text-transparent">
                NFT Marketplace
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              <Link 
                href="/marketplace" 
                prefetch={true}
                className={`transition-colors font-medium relative group ${
                  isActive('/marketplace')
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
                }`}
              >
                Marketplace
                <span className={`absolute bottom-0 left-0 h-0.5 bg-primary-600 dark:bg-primary-400 transition-all duration-300 ${
                  isActive('/marketplace') ? 'w-full' : 'w-0 group-hover:w-full'
                }`}></span>
              </Link>
              <Link 
                href="/my-nfts" 
                prefetch={true}
                className={`transition-colors font-medium relative group ${
                  isActive('/my-nfts')
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
                }`}
              >
                My NFTs
                <span className={`absolute bottom-0 left-0 h-0.5 bg-primary-600 dark:bg-primary-400 transition-all duration-300 ${
                  isActive('/my-nfts') ? 'w-full' : 'w-0 group-hover:w-full'
                }`}></span>
              </Link>
              <Link 
                href="/create" 
                prefetch={true}
                className={`transition-colors font-medium relative group ${
                  isActive('/create')
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
                }`}
              >
                Create NFT
                <span className={`absolute bottom-0 left-0 h-0.5 bg-primary-600 dark:bg-primary-400 transition-all duration-300 ${
                  isActive('/create') ? 'w-full' : 'w-0 group-hover:w-full'
                }`}></span>
              </Link>
              <Link 
                href="/dashboard" 
                prefetch={true}
                className={`transition-colors font-medium relative group ${
                  isActive('/dashboard')
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
                }`}
              >
                Dashboard
                <span className={`absolute bottom-0 left-0 h-0.5 bg-primary-600 dark:bg-primary-400 transition-all duration-300 ${
                  isActive('/dashboard') ? 'w-full' : 'w-0 group-hover:w-full'
                }`}></span>
              </Link>
              {(isAdmin || isMinter) && (
                <Link 
                  href="/admin" 
                  prefetch={true}
                  className={`flex items-center space-x-1 transition-colors font-medium relative group ${
                    isActive('/admin')
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Admin</span>
                  <span className={`absolute bottom-0 left-0 h-0.5 bg-primary-600 dark:bg-primary-400 transition-all duration-300 ${
                    isActive('/admin') ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}></span>
                </Link>
              )}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Theme Toggle - Only show when mounted */}
              {mounted && (
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 group"
                  aria-label="Toggle theme"
                >
                  {theme === 'light' ? (
                    <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:rotate-12 transition-transform duration-300" />
                  ) : (
                    <Sun className="w-5 h-5 text-yellow-500 group-hover:rotate-12 transition-transform duration-300" />
                  )}
                </button>
              )}

              {/* Desktop Wallet Connection */}
              <div className="hidden md:flex items-center space-x-3">
                {isConnected && address ? (
                  <>
                    <div className="flex items-center space-x-2 bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/30 dark:to-purple-900/30 px-4 py-2 rounded-lg border border-primary-200 dark:border-primary-800">
                      <Wallet className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatAddress(address)}</span>
                    </div>
                    <button
                      onClick={() => disconnect()}
                      className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-danger-600 dark:hover:text-danger-400 transition-colors rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Disconnect</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsWalletModalOpen(true)}
                    className="btn-primary text-sm flex items-center space-x-2"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Connect Wallet</span>
                  </button>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700 animate-slide-down">
              <div className="flex flex-col space-y-4">
                {/* Mobile Navigation Links */}
                <Link 
                  href="/marketplace" 
                  prefetch={true}
                  onClick={closeMobileMenu}
                  className={`transition-colors font-medium px-4 py-2 rounded-lg ${
                    isActive('/marketplace')
                      ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                      : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  Marketplace
                </Link>
                <Link 
                  href="/my-nfts" 
                  prefetch={true}
                  onClick={closeMobileMenu}
                  className={`transition-colors font-medium px-4 py-2 rounded-lg ${
                    isActive('/my-nfts')
                      ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                      : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  My NFTs
                </Link>
                <Link 
                  href="/create" 
                  prefetch={true}
                  onClick={closeMobileMenu}
                  className={`transition-colors font-medium px-4 py-2 rounded-lg ${
                    isActive('/create')
                      ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                      : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  Create NFT
                </Link>
                <Link 
                  href="/dashboard" 
                  prefetch={true}
                  onClick={closeMobileMenu}
                  className={`transition-colors font-medium px-4 py-2 rounded-lg ${
                    isActive('/dashboard')
                      ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                      : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  Dashboard
                </Link>
                {(isAdmin || isMinter) && (
                  <Link 
                    href="/admin" 
                    prefetch={true}
                    onClick={closeMobileMenu}
                    className={`flex items-center space-x-2 transition-colors font-medium px-4 py-2 rounded-lg ${
                      isActive('/admin')
                        ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                        : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin</span>
                  </Link>
                )}

                {/* Mobile Wallet Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                  {isConnected && address ? (
                    <div className="space-y-3 px-4">
                      <div className="flex items-center space-x-2 bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/30 dark:to-purple-900/30 px-4 py-3 rounded-lg border border-primary-200 dark:border-primary-800">
                        <Wallet className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatAddress(address)}</span>
                      </div>
                      <button
                        onClick={() => {
                          disconnect();
                          closeMobileMenu();
                        }}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-danger-600 dark:hover:text-danger-400 transition-colors rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Disconnect Wallet</span>
                      </button>
                    </div>
                  ) : (
                    <div className="px-4">
                      <button
                        onClick={() => {
                          setIsWalletModalOpen(true);
                          closeMobileMenu();
                        }}
                        className="w-full btn-primary text-sm flex items-center justify-center space-x-2 py-3"
                      >
                        <Wallet className="w-4 h-4" />
                        <span>Connect Wallet</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Wallet Modal */}
      <WalletModal 
        isOpen={isWalletModalOpen} 
        onClose={() => setIsWalletModalOpen(false)} 
      />
    </>
  );
}

'use client';

import { useAccount, useReadContract, useChainId } from 'wagmi';
import { NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI } from '@/config/contracts';
import { useRoles } from '@/hooks/useRoles';

export default function DebugPage() {
  const { address, isConnected, chain } = useAccount();
  const chainId = useChainId();
  const { isAdmin, isMinter, loading } = useRoles();

  // Get DEFAULT_ADMIN_ROLE from contract
  const { data: defaultAdminRole, error: adminRoleError, isLoading: adminRoleLoading } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_CONTRACT_ABI,
    functionName: 'DEFAULT_ADMIN_ROLE',
  });

  // Get MINTER_ROLE from contract
  const { data: minterRole, error: minterRoleError, isLoading: minterRoleLoading } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_CONTRACT_ABI,
    functionName: 'MINTER_ROLE',
  });

  // Check if address has admin role
  const { data: hasAdminRole, error: hasAdminError } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_CONTRACT_ABI,
    functionName: 'hasRole',
    args: [defaultAdminRole as `0x${string}`, address as `0x${string}`],
    query: {
      enabled: !!address && !!defaultAdminRole,
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          Debug Information
        </h1>

        <div className="space-y-6">
          {/* Connection Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Connection Status
            </h2>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Connected:</span>{' '}
                {isConnected ? '✅ Yes' : '❌ No'}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Address:</span>{' '}
                {address || 'Not connected'}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Chain ID:</span> {chainId}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Chain Name:</span> {chain?.name || 'Unknown'}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Expected Chain:</span> Hardhat (31337)
              </p>
              {chainId !== 31337 && (
                <p className="text-red-600 dark:text-red-400 font-medium mt-2">
                  ⚠️ Wrong network! Please switch to Hardhat Local (Chain ID: 31337)
                </p>
              )}
            </div>
          </div>

          {/* Contract Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Contract Configuration
            </h2>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">NFT Contract:</span>{' '}
                {NFT_CONTRACT_ADDRESS}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Expected:</span>{' '}
                0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
              </p>
            </div>
          </div>

          {/* Role Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Role Information
            </h2>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Loading:</span>{' '}
                {loading ? '⏳ Yes' : '✅ No'}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">DEFAULT_ADMIN_ROLE:</span>{' '}
                {adminRoleLoading ? '⏳ Loading...' : (defaultAdminRole || 'Failed to load')}
              </p>
              {adminRoleError && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                  Error: {adminRoleError.message}
                </p>
              )}
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">MINTER_ROLE:</span>{' '}
                {minterRoleLoading ? '⏳ Loading...' : (minterRole || 'Failed to load')}
              </p>
              {minterRoleError && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                  Error: {minterRoleError.message}
                </p>
              )}
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Has Admin Role:</span>{' '}
                {hasAdminRole ? '✅ Yes' : '❌ No'}
              </p>
              {hasAdminError && (
                <p className="text-red-600 dark:text-red-400">
                  Error: {hasAdminError.message}
                </p>
              )}
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Is Admin (from hook):</span>{' '}
                {isAdmin ? '✅ Yes' : '❌ No'}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Is Minter (from hook):</span>{' '}
                {isMinter ? '✅ Yes' : '❌ No'}
              </p>
            </div>
          </div>

          {/* Expected Admin Address */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Expected Admin Address
            </h2>
            <div className="space-y-2 text-sm">
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Address:</span>{' '}
                0x7637758d2AC10AC4DA30860CfAb74b32E7843080
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">Matches Connected:</span>{' '}
                {address?.toLowerCase() === '0x7637758d2AC10AC4DA30860CfAb74b32E7843080'.toLowerCase()
                  ? '✅ Yes'
                  : '❌ No'}
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4 text-blue-900 dark:text-blue-100">
              Troubleshooting Steps
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li>Make sure you&apos;re connected to the correct wallet address</li>
              <li>Switch MetaMask to &quot;Localhost 8545&quot; network (Chain ID: 31337)</li>
              <li>If you don&apos;t see Localhost network, add it manually:
                <ul className="list-disc list-inside ml-6 mt-1">
                  <li>Network Name: Localhost 8545</li>
                  <li>RPC URL: http://127.0.0.1:8545</li>
                  <li>Chain ID: 31337</li>
                  <li>Currency Symbol: ETH</li>
                </ul>
              </li>
              <li>Refresh the page after switching networks</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useReadContract } from 'wagmi';
import { useAccount } from 'wagmi';
import { NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI } from '@/config/contracts';

export function useRoles() {
  const { address, isConnected } = useAccount();

  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('useRoles - Contract Address:', NFT_CONTRACT_ADDRESS);
    console.log('useRoles - User Address:', address);
    console.log('useRoles - Connected:', isConnected);
  }

  // Get DEFAULT_ADMIN_ROLE from contract
  const { data: defaultAdminRole } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_CONTRACT_ABI,
    functionName: 'DEFAULT_ADMIN_ROLE',
  });

  // Get MINTER_ROLE from contract
  const { data: minterRole } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_CONTRACT_ABI,
    functionName: 'MINTER_ROLE',
  });

  const { data: isAdmin, isLoading: isLoadingAdmin } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_CONTRACT_ABI,
    functionName: 'hasRole',
    args: [defaultAdminRole as `0x${string}`, address as `0x${string}`],
    query: {
      enabled: !!address && !!defaultAdminRole && isConnected,
    },
  });

  const { data: isMinter, isLoading: isLoadingMinter } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: NFT_CONTRACT_ABI,
    functionName: 'hasRole',
    args: [minterRole as `0x${string}`, address as `0x${string}`],
    query: {
      enabled: !!address && !!minterRole && isConnected,
    },
  });

  return {
    isAdmin: !!isAdmin,
    isMinter: !!isMinter,
    hasAnyRole: !!isAdmin || !!isMinter,
    loading: isLoadingAdmin || isLoadingMinter,
  };
}

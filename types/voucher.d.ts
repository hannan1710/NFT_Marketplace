import { BigNumber } from "ethers";

/**
 * NFT Voucher structure for lazy minting
 */
export interface NFTVoucher {
  /** Token ID to be minted */
  tokenId: BigNumber | number;
  
  /** Minimum price in wei required to redeem the voucher */
  minPrice: BigNumber;
  
  /** IPFS or HTTP URI for token metadata */
  uri: string;
  
  /** Address authorized to redeem (use ethers.constants.AddressZero for anyone) */
  buyer: string;
  
  /** Unique nonce to prevent replay attacks */
  nonce: BigNumber | number;
  
  /** Unix timestamp when voucher expires (0 for no expiry) */
  expiry: BigNumber | number;
  
  /** EIP-712 signature from authorized signer */
  signature: string;
}

/**
 * Parameters for creating a new voucher
 */
export interface CreateVoucherParams {
  /** Address of the deployed NFT contract */
  contractAddress: string;
  
  /** Name of the NFT contract (must match contract) */
  contractName: string;
  
  /** Token ID to mint */
  tokenId: number;
  
  /** Minimum price in ETH (e.g., "0.1") */
  minPrice: string;
  
  /** Token metadata URI */
  uri: string;
  
  /** Buyer address or ethers.constants.AddressZero for anyone */
  buyer: string;
  
  /** Unique nonce (use Date.now() or sequential counter) */
  nonce: number;
  
  /** Expiry timestamp or 0 for no expiry */
  expiry: number;
}

/**
 * EIP-712 Domain structure
 */
export interface EIP712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

/**
 * EIP-712 Types for NFTVoucher
 */
export interface EIP712Types {
  NFTVoucher: Array<{
    name: string;
    type: string;
  }>;
}

/**
 * Voucher verification result
 */
export interface VoucherVerification {
  /** Address that signed the voucher */
  signer: string;
  
  /** Whether the voucher is valid and can be redeemed */
  isValid: boolean;
}

/**
 * Creates and signs an NFT voucher
 * @param params Voucher parameters
 * @param signer Ethers signer with SIGNER_ROLE
 * @returns Signed voucher ready for redemption
 */
export function createVoucher(
  params: CreateVoucherParams,
  signer: any
): Promise<NFTVoucher>;

/**
 * Verifies a voucher signature off-chain
 * @param voucher The voucher to verify
 * @param contractAddress Address of the NFT contract
 * @param contractName Name of the NFT contract
 * @param chainId Chain ID
 * @returns Recovered signer address
 */
export function verifyVoucherSignature(
  voucher: NFTVoucher,
  contractAddress: string,
  contractName: string,
  chainId: number
): string;

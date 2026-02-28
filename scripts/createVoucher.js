// Utility script to create and sign NFT vouchers for lazy minting
const { ethers } = require("hardhat");

/**
 * Creates and signs an NFT voucher using EIP-712
 * @param {Object} params - Voucher parameters
 * @param {string} params.contractAddress - Address of the NFT contract
 * @param {string} params.contractName - Name of the NFT contract
 * @param {number} params.tokenId - Token ID to mint
 * @param {string} params.minPrice - Minimum price in ETH (e.g., "0.1")
 * @param {string} params.uri - Token metadata URI
 * @param {string} params.buyer - Buyer address (use ethers.constants.AddressZero for anyone)
 * @param {number} params.nonce - Unique nonce for this voucher
 * @param {number} params.expiry - Expiry timestamp (0 for no expiry)
 * @param {Object} signer - Ethers signer with SIGNER_ROLE
 * @returns {Object} Signed voucher ready for redemption
 */
async function createVoucher(params, signer) {
  const {
    contractAddress,
    contractName,
    tokenId,
    minPrice,
    uri,
    buyer,
    nonce,
    expiry,
  } = params;

  // Get chain ID
  const chainId = await signer.getChainId();

  // EIP-712 Domain
  const domain = {
    name: contractName,
    version: "1",
    chainId: chainId,
    verifyingContract: contractAddress,
  };

  // EIP-712 Types
  const types = {
    NFTVoucher: [
      { name: "tokenId", type: "uint256" },
      { name: "minPrice", type: "uint256" },
      { name: "uri", type: "string" },
      { name: "buyer", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "expiry", type: "uint256" },
    ],
  };

  // Voucher data
  const voucher = {
    tokenId: tokenId,
    minPrice: ethers.utils.parseEther(minPrice),
    uri: uri,
    buyer: buyer,
    nonce: nonce,
    expiry: expiry,
  };

  // Sign the voucher
  const signature = await signer._signTypedData(domain, types, voucher);

  // Return complete voucher with signature
  return {
    ...voucher,
    signature,
  };
}

/**
 * Verifies a voucher signature
 * @param {Object} voucher - The voucher to verify
 * @param {string} contractAddress - Address of the NFT contract
 * @param {string} contractName - Name of the NFT contract
 * @param {number} chainId - Chain ID
 * @returns {string} Recovered signer address
 */
function verifyVoucherSignature(voucher, contractAddress, contractName, chainId) {
  const domain = {
    name: contractName,
    version: "1",
    chainId: chainId,
    verifyingContract: contractAddress,
  };

  const types = {
    NFTVoucher: [
      { name: "tokenId", type: "uint256" },
      { name: "minPrice", type: "uint256" },
      { name: "uri", type: "string" },
      { name: "buyer", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "expiry", type: "uint256" },
    ],
  };

  const voucherData = {
    tokenId: voucher.tokenId,
    minPrice: voucher.minPrice,
    uri: voucher.uri,
    buyer: voucher.buyer,
    nonce: voucher.nonce,
    expiry: voucher.expiry,
  };

  const recoveredAddress = ethers.utils.verifyTypedData(
    domain,
    types,
    voucherData,
    voucher.signature
  );

  return recoveredAddress;
}

/**
 * Example usage
 */
async function main() {
  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("Creating voucher with signer:", signer.address);

  // Contract details (update these with your deployed contract)
  const CONTRACT_ADDRESS = "0x..."; // Your deployed contract address
  const CONTRACT_NAME = "MyNFTCollection";

  // Create voucher
  const voucher = await createVoucher(
    {
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      tokenId: 1,
      minPrice: "0.1", // 0.1 ETH
      uri: "ipfs://QmExample123/1",
      buyer: ethers.constants.AddressZero, // Anyone can redeem
      nonce: Date.now(), // Use timestamp as nonce
      expiry: 0, // No expiry
    },
    signer
  );

  console.log("\n=== Created Voucher ===");
  console.log(JSON.stringify(voucher, null, 2));

  // Verify signature
  const chainId = await signer.getChainId();
  const recoveredSigner = verifyVoucherSignature(
    voucher,
    CONTRACT_ADDRESS,
    CONTRACT_NAME,
    chainId
  );

  console.log("\n=== Verification ===");
  console.log("Expected signer:", signer.address);
  console.log("Recovered signer:", recoveredSigner);
  console.log("Signature valid:", recoveredSigner === signer.address);

  // Save voucher to file
  const fs = require("fs");
  const voucherData = {
    ...voucher,
    minPrice: voucher.minPrice.toString(), // Convert BigNumber to string for JSON
  };
  fs.writeFileSync(
    `voucher-${voucher.tokenId}.json`,
    JSON.stringify(voucherData, null, 2)
  );
  console.log(`\nVoucher saved to voucher-${voucher.tokenId}.json`);
}

// Export functions for use in other scripts
module.exports = {
  createVoucher,
  verifyVoucherSignature,
};

// Run if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

const { ethers } = require("hardhat");

async function main() {
  const nftAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const walletAddress = "0xE7c2BA1d96EA2a1c52e3d2e7c2aeFC3fbB822535"; // Your wallet
  
  console.log("Checking NFT balance...");
  console.log("Contract:", nftAddress);
  console.log("Wallet:", walletAddress);
  
  const NFT = await ethers.getContractAt("NFTContract", nftAddress);
  
  // Get balance
  const balance = await NFT.balanceOf(walletAddress);
  console.log("\n✅ Your NFT Balance:", balance.toString());
  
  // Get total supply
  const totalSupply = await NFT.totalSupply();
  console.log("Total Supply:", totalSupply.toString());
  
  // Get max supply
  const maxSupply = await NFT.maxSupply();
  console.log("Max Supply:", maxSupply.toString());
  
  // List owned token IDs (if balance > 0)
  if (balance > 0) {
    console.log("\nYour NFT Token IDs:");
    for (let i = 0; i < balance; i++) {
      try {
        const tokenId = await NFT.tokenOfOwnerByIndex(walletAddress, i);
        console.log(`  - Token ID: ${tokenId.toString()}`);
      } catch (error) {
        // Contract might not support enumeration
        console.log("  (Token enumeration not supported)");
        break;
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

const { ethers } = require("hardhat");

async function main() {
  const nftAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const mintTo = "0xE7c2BA1d96EA2a1c52e3d2e7c2aeFC3fbB822535"; // Your wallet address
  
  console.log("Minting NFT...");
  console.log("Contract:", nftAddress);
  console.log("Minting to:", mintTo);
  
  const NFT = await ethers.getContractAt("NFTContract", nftAddress);
  
  // Mint NFT
  const tx = await NFT.mint(mintTo);
  console.log("\nTransaction sent:", tx.hash);
  
  const receipt = await tx.wait();
  console.log("✅ NFT Minted!");
  console.log("Block:", receipt.blockNumber);
  
  // Get token ID from event
  const event = receipt.logs.find(log => {
    try {
      return NFT.interface.parseLog(log).name === 'Transfer';
    } catch {
      return false;
    }
  });
  
  if (event) {
    const parsed = NFT.interface.parseLog(event);
    console.log("Token ID:", parsed.args.tokenId.toString());
  }
  
  // Check total supply
  const totalSupply = await NFT.totalSupply();
  console.log("Total Supply:", totalSupply.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

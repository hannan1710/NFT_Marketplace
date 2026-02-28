const { ethers } = require("hardhat");

async function main() {
  const nftAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const marketplaceAddress = "0x0165878A594ca255338adfa4d48449f69242Eb8F";
  
  const [deployer] = await ethers.getSigners();
  
  const NFT = await ethers.getContractAt("NFTContract", nftAddress);
  const Marketplace = await ethers.getContractAt("NFTMarketplace", marketplaceAddress);
  
  console.log("Creating test listings...\n");
  
  // Mint and list 5 NFTs
  for (let i = 0; i < 5; i++) {
    console.log(`Creating NFT #${i + 1}...`);
    
    // Mint NFT
    const mintTx = await NFT.mint(deployer.address);
    await mintTx.wait();
    console.log(`✅ Minted NFT`);
    
    // Get token ID (assuming sequential)
    const tokenId = i;
    
    // Approve marketplace
    const approveTx = await NFT.approve(marketplaceAddress, tokenId);
    await approveTx.wait();
    console.log(`✅ Approved marketplace`);
    
    // Create listing with random price between 0.1 and 2 ETH
    const price = ethers.parseEther((Math.random() * 1.9 + 0.1).toFixed(3));
    const listTx = await Marketplace.createListing(nftAddress, tokenId, price);
    await listTx.wait();
    console.log(`✅ Listed for ${ethers.formatEther(price)} ETH`);
    console.log(`---`);
  }
  
  console.log("\n✅ Created 5 test listings!");
  console.log("Refresh your marketplace page to see them.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

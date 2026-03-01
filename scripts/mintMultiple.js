const { ethers } = require("hardhat");

async function main() {
  const nftAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const mintTo = "0xE7c2BA1d96EA2a1c52e3d2e7c2aeFC3fbB822535"; // Your wallet
  const count = 5; // Number of NFTs to mint
  
  console.log(`Minting ${count} NFTs to ${mintTo}...`);
  console.log("Contract:", nftAddress);
  
  const NFT = await ethers.getContractAt("NFTContract", nftAddress);
  
  const startSupply = await NFT.totalSupply();
  console.log("Starting Supply:", startSupply.toString());
  
  for (let i = 0; i < count; i++) {
    console.log(`\n[${i + 1}/${count}] Minting NFT...`);
    const tx = await NFT.mint(mintTo);
    const receipt = await tx.wait();
    
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
      console.log(`✅ NFT minted! Token ID: ${parsed.args.tokenId.toString()}`);
    }
  }
  
  const finalSupply = await NFT.totalSupply();
  console.log(`\n✅ All done!`);
  console.log(`Total Supply: ${finalSupply.toString()}`);
  console.log(`Minted: ${count} NFTs`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

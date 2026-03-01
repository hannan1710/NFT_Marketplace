const { ethers } = require("hardhat");

async function main() {
  console.log("\n🔍 Checking NFT Marketplace Setup...\n");

  const YOUR_WALLET = "0xE7c2BA1d96EA2a1c52e3d2e7c2aeFC3fbB822535";

  try {
    // Load contract addresses
    const fs = require('fs');
    const nftDeployment = JSON.parse(fs.readFileSync('deployments/localhost-latest.json', 'utf8'));
    const NFT_ADDRESS = nftDeployment.contracts.NFTContract.proxy;

    console.log("📍 Contract Address:", NFT_ADDRESS);

    // Get contract
    const NFTContract = await ethers.getContractAt("NFTContract", NFT_ADDRESS);

    // Check wallet balance
    const balance = await ethers.provider.getBalance(YOUR_WALLET);
    console.log("\n💰 Wallet Balance:", ethers.formatEther(balance), "ETH");
    
    if (balance === 0n) {
      console.log("❌ Wallet has no ETH! Run: npx hardhat run scripts/fundWallet.js --network localhost");
      return;
    } else {
      console.log("✅ Wallet has sufficient ETH");
    }

    // Check roles
    const MINTER_ROLE = await NFTContract.MINTER_ROLE();
    const ADMIN_ROLE = await NFTContract.DEFAULT_ADMIN_ROLE();
    
    const hasMinterRole = await NFTContract.hasRole(MINTER_ROLE, YOUR_WALLET);
    const hasAdminRole = await NFTContract.hasRole(ADMIN_ROLE, YOUR_WALLET);

    console.log("\n🔐 Role Status:");
    console.log("   MINTER_ROLE:", hasMinterRole ? "✅ Granted" : "❌ Not granted");
    console.log("   ADMIN_ROLE:", hasAdminRole ? "✅ Granted" : "❌ Not granted");

    if (!hasMinterRole) {
      console.log("\n❌ Missing MINTER_ROLE! Run: npx hardhat run scripts/grantAllRoles.js --network localhost");
      return;
    }

    // Check contract info
    const totalSupply = await NFTContract.totalSupply();
    const maxSupply = await NFTContract.maxSupply();
    
    console.log("\n📊 Contract Info:");
    console.log("   Total Supply:", totalSupply.toString());
    console.log("   Max Supply:", maxSupply.toString());

    console.log("\n✅ Everything is ready! You can mint NFTs now.\n");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.log("\nMake sure:");
    console.log("1. Hardhat node is running");
    console.log("2. Contracts are deployed");
    console.log("3. Run start-dev.bat to set everything up\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting Sepolia Testnet Deployment...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  if (balance < hre.ethers.parseEther("0.1")) {
    console.warn("⚠️  Warning: Low balance. You may need more ETH for deployment.");
  }

  // Deploy NFT Contract
  console.log("📦 Deploying NFT Contract...");
  const NFTContract = await hre.ethers.getContractFactory("NFTContract");
  
  const nftName = process.env.NFT_NAME || "AI-Powered NFT";
  const nftSymbol = process.env.NFT_SYMBOL || "AINFT";
  const baseURI = process.env.NFT_BASE_URI || "ipfs://";
  
  const nft = await hre.upgrades.deployProxy(
    NFTContract,
    [nftName, nftSymbol, baseURI],
    { 
      initializer: "initialize",
      kind: "uups"
    }
  );
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  
  console.log("✅ NFT Contract deployed to:", nftAddress);
  console.log("   Implementation:", await hre.upgrades.erc1967.getImplementationAddress(nftAddress));
  console.log("   Admin:", await hre.upgrades.erc1967.getAdminAddress(nftAddress), "\n");

  // Deploy Marketplace Contract
  console.log("📦 Deploying Marketplace Contract...");
  const NFTMarketplace = await hre.ethers.getContractFactory("NFTMarketplace");
  
  const feePercent = process.env.MARKETPLACE_FEE_PERCENT || 250; // 2.5%
  const feeRecipient = process.env.MARKETPLACE_FEE_RECIPIENT || deployer.address;
  
  const marketplace = await hre.upgrades.deployProxy(
    NFTMarketplace,
    [feePercent, feeRecipient],
    { 
      initializer: "initialize",
      kind: "uups"
    }
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  
  console.log("✅ Marketplace Contract deployed to:", marketplaceAddress);
  console.log("   Implementation:", await hre.upgrades.erc1967.getImplementationAddress(marketplaceAddress));
  console.log("   Admin:", await hre.upgrades.erc1967.getAdminAddress(marketplaceAddress), "\n");

  // Save deployment info
  const deploymentInfo = {
    network: "sepolia",
    chainId: 11155111,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      NFTContract: {
        proxy: nftAddress,
        implementation: await hre.upgrades.erc1967.getImplementationAddress(nftAddress),
        admin: await hre.upgrades.erc1967.getAdminAddress(nftAddress),
        name: nftName,
        symbol: nftSymbol,
        baseURI: baseURI,
      },
      NFTMarketplace: {
        proxy: marketplaceAddress,
        implementation: await hre.upgrades.erc1967.getImplementationAddress(marketplaceAddress),
        admin: await hre.upgrades.erc1967.getAdminAddress(marketplaceAddress),
        feePercent: feePercent,
        feeRecipient: feeRecipient,
      },
    },
  };

  const deploymentsDir = path.join(__dirname, "../../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `sepolia-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Also save latest deployment
  fs.writeFileSync(
    path.join(deploymentsDir, "sepolia-latest.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("📄 Deployment info saved to:", filename, "\n");

  // Print summary
  console.log("=" .repeat(60));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=" .repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("   NFT Contract:", nftAddress);
  console.log("   Marketplace:", marketplaceAddress);
  console.log("\n🔗 Verify contracts with:");
  console.log(`   npm run verify:sepolia`);
  console.log("\n🌐 View on Etherscan:");
  console.log(`   https://sepolia.etherscan.io/address/${nftAddress}`);
  console.log(`   https://sepolia.etherscan.io/address/${marketplaceAddress}`);
  console.log("\n💡 Next steps:");
  console.log("   1. Verify contracts on Etherscan");
  console.log("   2. Update frontend .env with contract addresses");
  console.log("   3. Test contract interactions");
  console.log("   4. Grant necessary roles if needed");
  console.log("=" .repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

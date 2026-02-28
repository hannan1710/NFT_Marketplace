const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔄 Starting Contract Upgrade on Sepolia...\n");

  // Load latest deployment
  const deploymentPath = path.join(__dirname, "../../deployments/sepolia-latest.json");
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ No deployment found. Deploy contracts first with: npm run deploy:sepolia");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  
  console.log("📄 Loaded deployment from:", new Date(deployment.timestamp).toLocaleString());
  console.log("📍 Current NFT Proxy:", deployment.contracts.NFTContract.proxy);
  console.log("📍 Current NFT Implementation:", deployment.contracts.NFTContract.implementation);
  console.log("📍 Current Marketplace Proxy:", deployment.contracts.NFTMarketplace.proxy);
  console.log("📍 Current Marketplace Implementation:", deployment.contracts.NFTMarketplace.implementation, "\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Upgrading with account:", deployer.address, "\n");

  // Upgrade NFT Contract
  console.log("🔄 Upgrading NFT Contract...");
  const NFTContractV2 = await hre.ethers.getContractFactory("NFTContract");
  
  const nftUpgraded = await hre.upgrades.upgradeProxy(
    deployment.contracts.NFTContract.proxy,
    NFTContractV2
  );
  await nftUpgraded.waitForDeployment();
  
  const newNFTImplementation = await hre.upgrades.erc1967.getImplementationAddress(
    deployment.contracts.NFTContract.proxy
  );
  
  console.log("✅ NFT Contract upgraded!");
  console.log("   Proxy (unchanged):", deployment.contracts.NFTContract.proxy);
  console.log("   New Implementation:", newNFTImplementation);
  console.log("   Old Implementation:", deployment.contracts.NFTContract.implementation, "\n");

  // Upgrade Marketplace Contract
  console.log("🔄 Upgrading Marketplace Contract...");
  const NFTMarketplaceV2 = await hre.ethers.getContractFactory("NFTMarketplace");
  
  const marketplaceUpgraded = await hre.upgrades.upgradeProxy(
    deployment.contracts.NFTMarketplace.proxy,
    NFTMarketplaceV2
  );
  await marketplaceUpgraded.waitForDeployment();
  
  const newMarketplaceImplementation = await hre.upgrades.erc1967.getImplementationAddress(
    deployment.contracts.NFTMarketplace.proxy
  );
  
  console.log("✅ Marketplace Contract upgraded!");
  console.log("   Proxy (unchanged):", deployment.contracts.NFTMarketplace.proxy);
  console.log("   New Implementation:", newMarketplaceImplementation);
  console.log("   Old Implementation:", deployment.contracts.NFTMarketplace.implementation, "\n");

  // Save upgrade info
  const upgradeInfo = {
    network: "sepolia",
    chainId: 11155111,
    upgrader: deployer.address,
    timestamp: new Date().toISOString(),
    previousDeployment: deployment,
    upgrades: {
      NFTContract: {
        proxy: deployment.contracts.NFTContract.proxy,
        oldImplementation: deployment.contracts.NFTContract.implementation,
        newImplementation: newNFTImplementation,
      },
      NFTMarketplace: {
        proxy: deployment.contracts.NFTMarketplace.proxy,
        oldImplementation: deployment.contracts.NFTMarketplace.implementation,
        newImplementation: newMarketplaceImplementation,
      },
    },
  };

  const upgradesDir = path.join(__dirname, "../../deployments/upgrades");
  if (!fs.existsSync(upgradesDir)) {
    fs.mkdirSync(upgradesDir, { recursive: true });
  }

  const filename = `sepolia-upgrade-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(upgradesDir, filename),
    JSON.stringify(upgradeInfo, null, 2)
  );

  // Update latest deployment
  deployment.contracts.NFTContract.implementation = newNFTImplementation;
  deployment.contracts.NFTMarketplace.implementation = newMarketplaceImplementation;
  deployment.lastUpgrade = new Date().toISOString();
  
  fs.writeFileSync(
    deploymentPath,
    JSON.stringify(deployment, null, 2)
  );

  console.log("📄 Upgrade info saved to:", filename, "\n");

  // Print summary
  console.log("=" .repeat(60));
  console.log("🎉 UPGRADE SUCCESSFUL!");
  console.log("=" .repeat(60));
  console.log("\n📋 Updated Implementations:");
  console.log("   NFT:", newNFTImplementation);
  console.log("   Marketplace:", newMarketplaceImplementation);
  console.log("\n🔗 Verify new implementations:");
  console.log(`   npx hardhat verify --network sepolia ${newNFTImplementation}`);
  console.log(`   npx hardhat verify --network sepolia ${newMarketplaceImplementation}`);
  console.log("\n🌐 View on Etherscan:");
  console.log(`   https://sepolia.etherscan.io/address/${newNFTImplementation}`);
  console.log(`   https://sepolia.etherscan.io/address/${newMarketplaceImplementation}`);
  console.log("\n💡 Next steps:");
  console.log("   1. Verify new implementation contracts");
  console.log("   2. Test upgraded contract functions");
  console.log("   3. Monitor for any issues");
  console.log("   4. Update documentation");
  console.log("=" .repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Upgrade failed:", error);
    process.exit(1);
  });

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("🚨 MAINNET CONTRACT UPGRADE - CRITICAL OPERATION 🚨\n");
  console.log("⚠️  WARNING: You are about to upgrade contracts on Ethereum Mainnet!");
  console.log("⚠️  This is irreversible and affects live production contracts.\n");

  // Load latest deployment
  const deploymentPath = path.join(__dirname, "../../deployments/mainnet-latest.json");
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ No deployment found. Deploy contracts first with: npm run deploy:mainnet");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  
  console.log("📄 Current deployment from:", new Date(deployment.timestamp).toLocaleString());
  console.log("📍 NFT Proxy:", deployment.contracts.NFTContract.proxy);
  console.log("📍 NFT Implementation:", deployment.contracts.NFTContract.implementation);
  console.log("📍 Marketplace Proxy:", deployment.contracts.NFTMarketplace.proxy);
  console.log("📍 Marketplace Implementation:", deployment.contracts.NFTMarketplace.implementation, "\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Upgrading with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Safety checks
  console.log("🔍 Pre-upgrade Checklist:");
  console.log("   ✓ New implementation tested on testnet");
  console.log("   ✓ Storage layout compatibility verified");
  console.log("   ✓ Security audit completed for changes");
  console.log("   ✓ Upgrade tested on mainnet fork");
  console.log("   ✓ Team notified of upgrade");
  console.log("   ✓ Rollback plan prepared\n");

  const confirm1 = await question("❓ Have you completed ALL items in the checklist? (yes/no): ");
  if (confirm1.toLowerCase() !== "yes") {
    console.log("❌ Upgrade cancelled. Complete the checklist first.");
    rl.close();
    process.exit(0);
  }

  const confirm2 = await question("❓ Have you tested this upgrade on Sepolia testnet? (yes/no): ");
  if (confirm2.toLowerCase() !== "yes") {
    console.log("❌ Upgrade cancelled. Test on testnet first.");
    rl.close();
    process.exit(0);
  }

  const confirm3 = await question("❓ Are you ABSOLUTELY SURE you want to upgrade MAINNET contracts? (yes/no): ");
  if (confirm3.toLowerCase() !== "yes") {
    console.log("❌ Upgrade cancelled.");
    rl.close();
    process.exit(0);
  }

  const confirm4 = await question("❓ Type 'UPGRADE MAINNET' to proceed: ");
  if (confirm4 !== "UPGRADE MAINNET") {
    console.log("❌ Upgrade cancelled.");
    rl.close();
    process.exit(0);
  }

  rl.close();

  console.log("\n🔄 Starting Mainnet Upgrade...\n");

  // Upgrade NFT Contract
  console.log("🔄 Upgrading NFT Contract...");
  const NFTContractV2 = await hre.ethers.getContractFactory("NFTContract");
  
  const nftUpgraded = await hre.upgrades.upgradeProxy(
    deployment.contracts.NFTContract.proxy,
    NFTContractV2,
    { timeout: 0 }
  );
  await nftUpgraded.waitForDeployment();
  
  console.log("⏳ Waiting for 5 confirmations...");
  await nftUpgraded.deploymentTransaction().wait(5);
  
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
    NFTMarketplaceV2,
    { timeout: 0 }
  );
  await marketplaceUpgraded.waitForDeployment();
  
  console.log("⏳ Waiting for 5 confirmations...");
  await marketplaceUpgraded.deploymentTransaction().wait(5);
  
  const newMarketplaceImplementation = await hre.upgrades.erc1967.getImplementationAddress(
    deployment.contracts.NFTMarketplace.proxy
  );
  
  console.log("✅ Marketplace Contract upgraded!");
  console.log("   Proxy (unchanged):", deployment.contracts.NFTMarketplace.proxy);
  console.log("   New Implementation:", newMarketplaceImplementation);
  console.log("   Old Implementation:", deployment.contracts.NFTMarketplace.implementation, "\n");

  // Save upgrade info
  const upgradeInfo = {
    network: "mainnet",
    chainId: 1,
    upgrader: deployer.address,
    timestamp: new Date().toISOString(),
    previousDeployment: deployment,
    upgrades: {
      NFTContract: {
        proxy: deployment.contracts.NFTContract.proxy,
        oldImplementation: deployment.contracts.NFTContract.implementation,
        newImplementation: newNFTImplementation,
        gasUsed: (await nftUpgraded.deploymentTransaction().wait()).gasUsed.toString(),
      },
      NFTMarketplace: {
        proxy: deployment.contracts.NFTMarketplace.proxy,
        oldImplementation: deployment.contracts.NFTMarketplace.implementation,
        newImplementation: newMarketplaceImplementation,
        gasUsed: (await marketplaceUpgraded.deploymentTransaction().wait()).gasUsed.toString(),
      },
    },
  };

  const upgradesDir = path.join(__dirname, "../../deployments/upgrades");
  if (!fs.existsSync(upgradesDir)) {
    fs.mkdirSync(upgradesDir, { recursive: true });
  }

  const filename = `mainnet-upgrade-${Date.now()}.json`;
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
  console.log("🎉 MAINNET UPGRADE SUCCESSFUL!");
  console.log("=" .repeat(60));
  console.log("\n📋 Updated Implementations:");
  console.log("   NFT:", newNFTImplementation);
  console.log("   Marketplace:", newMarketplaceImplementation);
  console.log("\n🔗 Verify new implementations:");
  console.log(`   npx hardhat verify --network mainnet ${newNFTImplementation}`);
  console.log(`   npx hardhat verify --network mainnet ${newMarketplaceImplementation}`);
  console.log("\n🌐 View on Etherscan:");
  console.log(`   https://etherscan.io/address/${newNFTImplementation}`);
  console.log(`   https://etherscan.io/address/${newMarketplaceImplementation}`);
  console.log("\n⚠️  CRITICAL NEXT STEPS:");
  console.log("   1. ✅ Verify new implementation contracts IMMEDIATELY");
  console.log("   2. ✅ Test all contract functions thoroughly");
  console.log("   3. ✅ Monitor contract activity closely");
  console.log("   4. ✅ Notify team and users of upgrade");
  console.log("   5. ✅ Update documentation");
  console.log("   6. ✅ Back up upgrade info securely");
  console.log("=" .repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Upgrade failed:", error);
    process.exit(1);
  });

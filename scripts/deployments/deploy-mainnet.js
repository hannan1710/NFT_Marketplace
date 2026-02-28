const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("🚨 MAINNET DEPLOYMENT - PRODUCTION ENVIRONMENT 🚨\n");
  console.log("⚠️  WARNING: You are about to deploy to Ethereum Mainnet!");
  console.log("⚠️  This will cost real ETH and cannot be undone.\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying contracts with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  if (balance < hre.ethers.parseEther("0.5")) {
    console.error("❌ Insufficient balance for mainnet deployment!");
    console.error("   Recommended: At least 0.5 ETH for deployment + gas buffer");
    process.exit(1);
  }

  // Safety checks
  console.log("🔍 Pre-deployment Checklist:");
  console.log("   ✓ Contracts compiled and tested");
  console.log("   ✓ Test coverage > 90%");
  console.log("   ✓ Security audit completed");
  console.log("   ✓ Testnet deployment successful");
  console.log("   ✓ All tests passing\n");

  const confirm1 = await question("❓ Have you completed ALL items in the checklist? (yes/no): ");
  if (confirm1.toLowerCase() !== "yes") {
    console.log("❌ Deployment cancelled. Complete the checklist first.");
    rl.close();
    process.exit(0);
  }

  const confirm2 = await question("❓ Are you ABSOLUTELY SURE you want to deploy to MAINNET? (yes/no): ");
  if (confirm2.toLowerCase() !== "yes") {
    console.log("❌ Deployment cancelled.");
    rl.close();
    process.exit(0);
  }

  const confirm3 = await question("❓ Type 'DEPLOY TO MAINNET' to proceed: ");
  if (confirm3 !== "DEPLOY TO MAINNET") {
    console.log("❌ Deployment cancelled.");
    rl.close();
    process.exit(0);
  }

  rl.close();

  console.log("\n🚀 Starting Mainnet Deployment...\n");

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
      kind: "uups",
      timeout: 0, // No timeout for mainnet
    }
  );
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  
  console.log("✅ NFT Contract deployed to:", nftAddress);
  console.log("   Implementation:", await hre.upgrades.erc1967.getImplementationAddress(nftAddress));
  console.log("   Admin:", await hre.upgrades.erc1967.getAdminAddress(nftAddress));
  
  // Wait for confirmations
  console.log("⏳ Waiting for 5 confirmations...");
  await nft.deploymentTransaction().wait(5);
  console.log("✅ Confirmed!\n");

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
      kind: "uups",
      timeout: 0,
    }
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  
  console.log("✅ Marketplace Contract deployed to:", marketplaceAddress);
  console.log("   Implementation:", await hre.upgrades.erc1967.getImplementationAddress(marketplaceAddress));
  console.log("   Admin:", await hre.upgrades.erc1967.getAdminAddress(marketplaceAddress));
  
  console.log("⏳ Waiting for 5 confirmations...");
  await marketplace.deploymentTransaction().wait(5);
  console.log("✅ Confirmed!\n");

  // Save deployment info
  const deploymentInfo = {
    network: "mainnet",
    chainId: 1,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    gasUsed: {
      nft: (await nft.deploymentTransaction().wait()).gasUsed.toString(),
      marketplace: (await marketplace.deploymentTransaction().wait()).gasUsed.toString(),
    },
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

  const filename = `mainnet-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );

  fs.writeFileSync(
    path.join(deploymentsDir, "mainnet-latest.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("📄 Deployment info saved to:", filename, "\n");

  // Print summary
  console.log("=" .repeat(60));
  console.log("🎉 MAINNET DEPLOYMENT SUCCESSFUL!");
  console.log("=" .repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("   NFT Contract:", nftAddress);
  console.log("   Marketplace:", marketplaceAddress);
  console.log("\n🔗 Verify contracts with:");
  console.log(`   npm run verify:mainnet`);
  console.log("\n🌐 View on Etherscan:");
  console.log(`   https://etherscan.io/address/${nftAddress}`);
  console.log(`   https://etherscan.io/address/${marketplaceAddress}`);
  console.log("\n⚠️  CRITICAL NEXT STEPS:");
  console.log("   1. ✅ Verify contracts on Etherscan IMMEDIATELY");
  console.log("   2. ✅ Transfer ownership to multisig wallet");
  console.log("   3. ✅ Set up monitoring (Tenderly/Defender)");
  console.log("   4. ✅ Update frontend with contract addresses");
  console.log("   5. ✅ Test all contract functions");
  console.log("   6. ✅ Announce deployment to team");
  console.log("   7. ✅ Back up deployment info securely");
  console.log("=" .repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

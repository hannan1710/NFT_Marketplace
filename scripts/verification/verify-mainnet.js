const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Starting Contract Verification on Mainnet...\n");

  // Load latest deployment
  const deploymentPath = path.join(__dirname, "../../deployments/mainnet-latest.json");
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ No deployment found. Deploy contracts first with: npm run deploy:mainnet");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  
  console.log("📄 Loaded deployment from:", new Date(deployment.timestamp).toLocaleString());
  console.log("📍 Network:", deployment.network);
  console.log("📍 Chain ID:", deployment.chainId, "\n");

  // Verify NFT Contract Implementation
  console.log("🔍 Verifying NFT Contract Implementation...");
  try {
    await hre.run("verify:verify", {
      address: deployment.contracts.NFTContract.implementation,
      constructorArguments: [],
    });
    console.log("✅ NFT Contract Implementation verified!\n");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ NFT Contract Implementation already verified!\n");
    } else {
      console.error("❌ NFT Contract Implementation verification failed:", error.message, "\n");
    }
  }

  // Verify Marketplace Contract Implementation
  console.log("🔍 Verifying Marketplace Contract Implementation...");
  try {
    await hre.run("verify:verify", {
      address: deployment.contracts.NFTMarketplace.implementation,
      constructorArguments: [],
    });
    console.log("✅ Marketplace Contract Implementation verified!\n");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Marketplace Contract Implementation already verified!\n");
    } else {
      console.error("❌ Marketplace Contract Implementation verification failed:", error.message, "\n");
    }
  }

  // Print summary
  console.log("=" .repeat(60));
  console.log("🎉 MAINNET VERIFICATION COMPLETE!");
  console.log("=" .repeat(60));
  console.log("\n🌐 View verified contracts:");
  console.log(`   NFT Proxy: https://etherscan.io/address/${deployment.contracts.NFTContract.proxy}#code`);
  console.log(`   NFT Implementation: https://etherscan.io/address/${deployment.contracts.NFTContract.implementation}#code`);
  console.log(`   Marketplace Proxy: https://etherscan.io/address/${deployment.contracts.NFTMarketplace.proxy}#code`);
  console.log(`   Marketplace Implementation: https://etherscan.io/address/${deployment.contracts.NFTMarketplace.implementation}#code`);
  console.log("\n⚠️  IMPORTANT:");
  console.log("   - Users should interact with PROXY addresses");
  console.log("   - Never send funds to implementation addresses");
  console.log("   - Bookmark these URLs for future reference");
  console.log("=" .repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });

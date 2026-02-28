const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Starting Contract Verification on Sepolia...\n");

  // Load latest deployment
  const deploymentPath = path.join(__dirname, "../../deployments/sepolia-latest.json");
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ No deployment found. Deploy contracts first with: npm run deploy:sepolia");
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

  // Note about proxy verification
  console.log("📝 Note: Proxy contracts are automatically verified by Etherscan.");
  console.log("   The implementation contracts above are what users interact with.\n");

  // Print summary
  console.log("=" .repeat(60));
  console.log("🎉 VERIFICATION COMPLETE!");
  console.log("=" .repeat(60));
  console.log("\n🌐 View verified contracts:");
  console.log(`   NFT Proxy: https://sepolia.etherscan.io/address/${deployment.contracts.NFTContract.proxy}#code`);
  console.log(`   NFT Implementation: https://sepolia.etherscan.io/address/${deployment.contracts.NFTContract.implementation}#code`);
  console.log(`   Marketplace Proxy: https://sepolia.etherscan.io/address/${deployment.contracts.NFTMarketplace.proxy}#code`);
  console.log(`   Marketplace Implementation: https://sepolia.etherscan.io/address/${deployment.contracts.NFTMarketplace.implementation}#code`);
  console.log("\n💡 Users should interact with the PROXY addresses, not implementations.");
  console.log("=" .repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });

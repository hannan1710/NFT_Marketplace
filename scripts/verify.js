const { run } = require("hardhat");

async function verify(address, constructorArguments = []) {
  console.log(`Verifying contract at ${address}...`);
  
  try {
    await run("verify:verify", {
      address: address,
      constructorArguments: constructorArguments,
    });
    console.log("✅ Contract verified successfully");
  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("✅ Contract already verified");
    } else {
      console.error("❌ Verification failed:", error.message);
      throw error;
    }
  }
}

async function main() {
  const network = hre.network.name;
  
  // Load deployment info
  const fs = require("fs");
  const deploymentFile = `deployments/${network}-latest.json`;
  
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  
  console.log(`\n🔍 Verifying contracts on ${network}...\n`);
  
  // Verify NFT Contract Implementation
  if (deployment.contracts?.NFTContract?.implementation) {
    console.log("Verifying NFT Contract Implementation...");
    await verify(deployment.contracts.NFTContract.implementation);
  }
  
  // Verify Marketplace Implementation
  if (deployment.marketplace?.implementation) {
    console.log("\nVerifying Marketplace Implementation...");
    await verify(deployment.marketplace.implementation);
  }
  
  console.log("\n✅ All contracts verified!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

module.exports = { verify };

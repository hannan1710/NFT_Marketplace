const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔐 Granting Admin Role to Custom Address...\n");

  // Get the address from environment variable
  const customAddress = process.env.ADMIN_ADDRESS;
  
  if (!customAddress) {
    console.error("❌ Please provide an address!");
    console.log("\nUsage:");
    console.log("  ADMIN_ADDRESS=0x... npx hardhat run scripts/grantAdminToAddress.js --network localhost");
    console.log("\nExample:");
    console.log("  ADMIN_ADDRESS=0x7637758d2AC10AC4DA30860CfAb74b32E7843080 npx hardhat run scripts/grantAdminToAddress.js --network localhost");
    process.exit(1);
  }

  // Validate address format
  if (!customAddress.startsWith('0x') || customAddress.length !== 42) {
    console.error("❌ Invalid address format!");
    console.log("Address should be 42 characters starting with 0x");
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deployer address:", deployer.address);
  
  // Load deployment info
  const deploymentPath = path.join(__dirname, "../deployments/localhost-latest.json");
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ No deployment found!");
    console.log("Please deploy contracts first: npm run deploy:local");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const nftAddress = deployment.contracts.NFTContract.proxy;
  
  console.log("📍 NFT Contract:", nftAddress);
  console.log("📍 Target Address:", customAddress, "\n");

  // Get contract instance
  const nft = await hre.ethers.getContractAt("NFTContract", nftAddress);

  // Get roles
  const DEFAULT_ADMIN_ROLE = await nft.DEFAULT_ADMIN_ROLE();
  const MINTER_ROLE = await nft.MINTER_ROLE();

  // Check current roles
  const hasAdmin = await nft.hasRole(DEFAULT_ADMIN_ROLE, customAddress);
  const hasMinter = await nft.hasRole(MINTER_ROLE, customAddress);

  console.log("Current roles for", customAddress);
  console.log(`  Admin: ${hasAdmin ? '✅' : '❌'}`);
  console.log(`  Minter: ${hasMinter ? '✅' : '❌'}\n`);

  // Grant roles if needed
  if (!hasAdmin) {
    console.log("Granting ADMIN role...");
    const tx1 = await nft.grantRole(DEFAULT_ADMIN_ROLE, customAddress);
    await tx1.wait();
    console.log("✅ Admin role granted!\n");
  } else {
    console.log("✅ Already has admin role\n");
  }

  if (!hasMinter) {
    console.log("Granting MINTER role...");
    const tx2 = await nft.grantRole(MINTER_ROLE, customAddress);
    await tx2.wait();
    console.log("✅ Minter role granted!\n");
  } else {
    console.log("✅ Already has minter role\n");
  }

  // Verify roles
  const hasAdminNow = await nft.hasRole(DEFAULT_ADMIN_ROLE, customAddress);
  const hasMinterNow = await nft.hasRole(MINTER_ROLE, customAddress);

  console.log("=" .repeat(60));
  console.log("🎉 ROLES GRANTED SUCCESSFULLY!");
  console.log("=" .repeat(60));
  console.log("\n📋 Summary:");
  console.log(`   Address: ${customAddress}`);
  console.log(`   Admin Role: ${hasAdminNow ? '✅' : '❌'}`);
  console.log(`   Minter Role: ${hasMinterNow ? '✅' : '❌'}`);
  console.log("\n💡 Next steps:");
  console.log("   1. Open http://localhost:3000");
  console.log("   2. Connect MetaMask with this address");
  console.log("   3. Make sure you're on Localhost 8545 network");
  console.log("   4. Admin link will appear in navbar");
  console.log("   5. Or go directly to: http://localhost:3000/admin");
  console.log("=" .repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Failed to grant roles:", error);
    process.exit(1);
  });

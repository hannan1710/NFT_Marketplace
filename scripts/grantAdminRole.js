const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔐 Granting Admin Role...\n");

  const [deployer, ...accounts] = await hre.ethers.getSigners();
  console.log("📍 Deployer address:", deployer.address);
  
  // Try to load deployment info from multiple locations
  let nftAddress;
  const possiblePaths = [
    path.join(__dirname, "../deployments/localhost-latest.json"),
    path.join(__dirname, "../deployments/sepolia-latest.json"),
    path.join(__dirname, "../deployments/mainnet-latest.json"),
  ];
  
  for (const deploymentPath of possiblePaths) {
    if (fs.existsSync(deploymentPath)) {
      try {
        const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
        nftAddress = deployment.contracts.NFTContract.proxy || deployment.contracts.NFTContract.address;
        console.log("📄 Loaded from:", path.basename(deploymentPath));
        break;
      } catch (e) {
        console.log("⚠️  Could not parse:", path.basename(deploymentPath));
      }
    }
  }
  
  if (!nftAddress) {
    // Try environment variable
    nftAddress = process.env.NFT_CONTRACT_ADDRESS;
    
    if (!nftAddress) {
      console.error("❌ No deployment found!");
      console.log("\n📋 Options:");
      console.log("  1. Deploy contracts first:");
      console.log("     npm run deploy:local");
      console.log("\n  2. Or set NFT_CONTRACT_ADDRESS in .env:");
      console.log("     NFT_CONTRACT_ADDRESS=0x...");
      console.log("\n  3. Or pass as environment variable:");
      console.log("     NFT_CONTRACT_ADDRESS=0x... npx hardhat run scripts/grantAdminRole.js --network localhost");
      process.exit(1);
    }
    console.log("📄 Using address from environment variable");
  }

  console.log("📍 NFT Contract:", nftAddress, "\n");

  // Get contract instance
  const nft = await hre.ethers.getContractAt("NFTContract", nftAddress);

  // Get roles
  const DEFAULT_ADMIN_ROLE = await nft.DEFAULT_ADMIN_ROLE();
  const MINTER_ROLE = await nft.MINTER_ROLE();

  console.log("Available accounts:");
  for (let i = 0; i < Math.min(accounts.length, 5); i++) {
    console.log(`  [${i}] ${accounts[i].address}`);
  }
  console.log();

  // Grant admin role to first account (or specify index)
  const accountIndex = process.env.ADMIN_ACCOUNT_INDEX || 0;
  const adminAddress = accounts[accountIndex]?.address || deployer.address;

  console.log(`Granting roles to: ${adminAddress}\n`);

  // Check current roles
  const hasAdmin = await nft.hasRole(DEFAULT_ADMIN_ROLE, adminAddress);
  const hasMinter = await nft.hasRole(MINTER_ROLE, adminAddress);

  console.log("Current roles:");
  console.log(`  Admin: ${hasAdmin ? '✅' : '❌'}`);
  console.log(`  Minter: ${hasMinter ? '✅' : '❌'}\n`);

  // Grant roles if needed
  if (!hasAdmin) {
    console.log("Granting ADMIN role...");
    const tx1 = await nft.grantRole(DEFAULT_ADMIN_ROLE, adminAddress);
    await tx1.wait();
    console.log("✅ Admin role granted!\n");
  } else {
    console.log("✅ Already has admin role\n");
  }

  if (!hasMinter) {
    console.log("Granting MINTER role...");
    const tx2 = await nft.grantRole(MINTER_ROLE, adminAddress);
    await tx2.wait();
    console.log("✅ Minter role granted!\n");
  } else {
    console.log("✅ Already has minter role\n");
  }

  // Verify roles
  const hasAdminNow = await nft.hasRole(DEFAULT_ADMIN_ROLE, adminAddress);
  const hasMinterNow = await nft.hasRole(MINTER_ROLE, adminAddress);

  console.log("=" .repeat(60));
  console.log("🎉 ROLES GRANTED SUCCESSFULLY!");
  console.log("=" .repeat(60));
  console.log("\n📋 Summary:");
  console.log(`   Address: ${adminAddress}`);
  console.log(`   Admin Role: ${hasAdminNow ? '✅' : '❌'}`);
  console.log(`   Minter Role: ${hasMinterNow ? '✅' : '❌'}`);
  console.log("\n💡 Next steps:");
  console.log("   1. Open http://localhost:3000");
  console.log("   2. Connect wallet with this address");
  console.log("   3. Admin link will appear in navbar");
  console.log("   4. Or go directly to: http://localhost:3000/admin");
  console.log("=" .repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Failed to grant roles:", error);
    process.exit(1);
  });

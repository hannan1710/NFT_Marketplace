const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  console.log(`\n🔐 Granting roles on ${network}...\n`);

  // Load deployment
  const deploymentFile = path.join(__dirname, "..", "deployments", `${network}-latest.json`);
  
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const nftAddress = deployment.contracts.NFTContract.proxy;

  // Get contract
  const NFT = await ethers.getContractAt("NFTContract", nftAddress);
  
  // Get roles
  const ADMIN_ROLE = await NFT.ADMIN_ROLE();
  const MINTER_ROLE = await NFT.MINTER_ROLE();

  // Get addresses from environment or prompt
  const adminAddresses = process.env.ADMIN_ADDRESSES?.split(",") || [];
  const minterAddresses = process.env.MINTER_ADDRESSES?.split(",") || [];

  console.log("NFT Contract:", nftAddress);
  console.log("\nAdmin addresses to grant:", adminAddresses.length);
  console.log("Minter addresses to grant:", minterAddresses.length);

  // Grant admin roles
  for (const address of adminAddresses) {
    const trimmedAddress = address.trim();
    if (!ethers.isAddress(trimmedAddress)) {
      console.log(`⚠️  Invalid address: ${trimmedAddress}`);
      continue;
    }

    const hasRole = await NFT.hasRole(ADMIN_ROLE, trimmedAddress);
    if (hasRole) {
      console.log(`✓ ${trimmedAddress} already has ADMIN_ROLE`);
      continue;
    }

    console.log(`Granting ADMIN_ROLE to ${trimmedAddress}...`);
    const tx = await NFT.grantRole(ADMIN_ROLE, trimmedAddress);
    await tx.wait();
    console.log(`✅ ADMIN_ROLE granted to ${trimmedAddress}`);
  }

  // Grant minter roles
  for (const address of minterAddresses) {
    const trimmedAddress = address.trim();
    if (!ethers.isAddress(trimmedAddress)) {
      console.log(`⚠️  Invalid address: ${trimmedAddress}`);
      continue;
    }

    const hasRole = await NFT.hasRole(MINTER_ROLE, trimmedAddress);
    if (hasRole) {
      console.log(`✓ ${trimmedAddress} already has MINTER_ROLE`);
      continue;
    }

    console.log(`Granting MINTER_ROLE to ${trimmedAddress}...`);
    const tx = await NFT.grantRole(MINTER_ROLE, trimmedAddress);
    await tx.wait();
    console.log(`✅ MINTER_ROLE granted to ${trimmedAddress}`);
  }

  console.log("\n✅ Role granting complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

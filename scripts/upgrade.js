const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  console.log(`\n🔄 Upgrading contracts on ${network}...\n`);

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Upgrading with account:", deployer.address);

  // Load existing deployment
  const deploymentFile = path.join(__dirname, "..", "deployments", `${network}-latest.json`);
  
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  
  console.log("Current deployment:");
  console.log("- NFT Proxy:", deployment.contracts.NFTContract.proxy);
  console.log("- NFT Implementation:", deployment.contracts.NFTContract.implementation);
  console.log("- Marketplace Proxy:", deployment.contracts.NFTMarketplace.proxy);
  console.log("- Marketplace Implementation:", deployment.contracts.NFTMarketplace.implementation);

  // Confirm upgrade on mainnet
  if (network === "mainnet" || network === "polygon") {
    console.log("\n⚠️  WARNING: Upgrading contracts on MAINNET!");
    console.log("Press Ctrl+C to cancel, or wait 10 seconds to continue...");
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  // Upgrade NFT Contract
  console.log("\n📦 Upgrading NFT Contract...");
  const NFTContractV2 = await ethers.getContractFactory("NFTContract");
  
  const nftUpgraded = await upgrades.upgradeProxy(
    deployment.contracts.NFTContract.proxy,
    NFTContractV2,
    {
      timeout: 0,
    }
  );
  await nftUpgraded.waitForDeployment();
  
  const newNFTImplementation = await upgrades.erc1967.getImplementationAddress(
    deployment.contracts.NFTContract.proxy
  );
  
  console.log("✅ NFT Contract upgraded");
  console.log("   New Implementation:", newNFTImplementation);

  // Upgrade Marketplace Contract
  console.log("\n📦 Upgrading Marketplace Contract...");
  const NFTMarketplaceV2 = await ethers.getContractFactory("NFTMarketplace");
  
  const marketplaceUpgraded = await upgrades.upgradeProxy(
    deployment.contracts.NFTMarketplace.proxy,
    NFTMarketplaceV2,
    {
      timeout: 0,
    }
  );
  await marketplaceUpgraded.waitForDeployment();
  
  const newMarketplaceImplementation = await upgrades.erc1967.getImplementationAddress(
    deployment.contracts.NFTMarketplace.proxy
  );
  
  console.log("✅ Marketplace Contract upgraded");
  console.log("   New Implementation:", newMarketplaceImplementation);

  // Update deployment info
  const upgradeInfo = {
    ...deployment,
    upgraded: {
      timestamp: new Date().toISOString(),
      upgrader: deployer.address,
      previousImplementations: {
        nft: deployment.contracts.NFTContract.implementation,
        marketplace: deployment.contracts.NFTMarketplace.implementation,
      },
    },
    contracts: {
      NFTContract: {
        ...deployment.contracts.NFTContract,
        implementation: newNFTImplementation,
      },
      NFTMarketplace: {
        ...deployment.contracts.NFTMarketplace,
        implementation: newMarketplaceImplementation,
      },
    },
  };

  // Save upgrade info
  const upgradeFilename = `${network}-upgrade-${Date.now()}.json`;
  const latestFilename = `${network}-latest.json`;
  
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  
  fs.writeFileSync(
    path.join(deploymentsDir, upgradeFilename),
    JSON.stringify(upgradeInfo, null, 2)
  );
  
  fs.writeFileSync(
    path.join(deploymentsDir, latestFilename),
    JSON.stringify(upgradeInfo, null, 2)
  );

  console.log("\n💾 Upgrade info saved to:");
  console.log(`   - deployments/${upgradeFilename}`);
  console.log(`   - deployments/${latestFilename}`);

  console.log("\n📋 Next Steps:");
  console.log("1. Verify new implementations:");
  console.log(`   npx hardhat run scripts/verify.js --network ${network}`);
  console.log("\n2. Test upgraded contracts");
  console.log("\n3. Monitor for any issues");

  console.log("\n✅ Upgrade complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

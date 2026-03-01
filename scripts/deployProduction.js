const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  console.log(`\n🚀 Deploying to ${network}...\n`);

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    throw new Error("Deployer account has no funds!");
  }

  // Configuration
  const NFT_NAME = process.env.NFT_NAME || "Production NFT";
  const NFT_SYMBOL = process.env.NFT_SYMBOL || "PNFT";
  const BASE_URI = process.env.BASE_URI || "https://api.production.com/metadata/";
  const MAX_SUPPLY = process.env.MAX_SUPPLY || 10000;
  const MARKETPLACE_FEE = process.env.MARKETPLACE_FEE || 250; // 2.5%
  const FEE_RECIPIENT = process.env.FEE_RECIPIENT || deployer.address;

  console.log("\n📋 Configuration:");
  console.log("- NFT Name:", NFT_NAME);
  console.log("- NFT Symbol:", NFT_SYMBOL);
  console.log("- Base URI:", BASE_URI);
  console.log("- Max Supply:", MAX_SUPPLY);
  console.log("- Marketplace Fee:", MARKETPLACE_FEE / 100, "%");
  console.log("- Fee Recipient:", FEE_RECIPIENT);

  // Confirm deployment on mainnet
  if (network === "mainnet" || network === "polygon") {
    console.log("\n⚠️  WARNING: Deploying to MAINNET!");
    console.log("Press Ctrl+C to cancel, or wait 10 seconds to continue...");
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  console.log("\n📦 Deploying NFT Contract...");
  const NFTContract = await ethers.getContractFactory("NFTContract");
  const nft = await upgrades.deployProxy(
    NFTContract,
    [NFT_NAME, NFT_SYMBOL, BASE_URI, MAX_SUPPLY],
    {
      initializer: "initialize",
      kind: "uups",
      timeout: 0,
    }
  );
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  
  console.log("✅ NFT Contract deployed to:", nftAddress);
  console.log("   Implementation:", await upgrades.erc1967.getImplementationAddress(nftAddress));

  console.log("\n📦 Deploying Marketplace Contract...");
  const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
  const marketplace = await upgrades.deployProxy(
    NFTMarketplace,
    [MARKETPLACE_FEE, FEE_RECIPIENT],
    {
      initializer: "initialize",
      kind: "uups",
      timeout: 0,
    }
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  
  console.log("✅ Marketplace deployed to:", marketplaceAddress);
  console.log("   Implementation:", await upgrades.erc1967.getImplementationAddress(marketplaceAddress));

  // Save deployment info
  const deploymentInfo = {
    network: network,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      NFTContract: {
        proxy: nftAddress,
        implementation: await upgrades.erc1967.getImplementationAddress(nftAddress),
        admin: await upgrades.erc1967.getAdminAddress(nftAddress),
      },
      NFTMarketplace: {
        proxy: marketplaceAddress,
        implementation: await upgrades.erc1967.getImplementationAddress(marketplaceAddress),
        admin: await upgrades.erc1967.getAdminAddress(marketplaceAddress),
      },
    },
    config: {
      nftName: NFT_NAME,
      nftSymbol: NFT_SYMBOL,
      baseURI: BASE_URI,
      maxSupply: MAX_SUPPLY,
      marketplaceFee: MARKETPLACE_FEE,
      feeRecipient: FEE_RECIPIENT,
    },
  };

  // Create deployments directory
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info
  const filename = `${network}-${Date.now()}.json`;
  const latestFilename = `${network}-latest.json`;
  
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  fs.writeFileSync(
    path.join(deploymentsDir, latestFilename),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n💾 Deployment info saved to:");
  console.log(`   - deployments/${filename}`);
  console.log(`   - deployments/${latestFilename}`);

  console.log("\n📋 Next Steps:");
  console.log("1. Verify contracts:");
  console.log(`   npx hardhat run scripts/verify.js --network ${network}`);
  console.log("\n2. Update frontend .env:");
  console.log(`   NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=${nftAddress}`);
  console.log(`   NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=${marketplaceAddress}`);
  console.log("\n3. Grant roles:");
  console.log(`   npx hardhat run scripts/grantRoles.js --network ${network}`);

  console.log("\n✅ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

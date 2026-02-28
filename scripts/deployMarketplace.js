// Hardhat deployment script for NFTMarketplace
const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("Deploying NFTMarketplace with UUPS proxy...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Configuration parameters
  const MARKETPLACE_FEE = 250; // 2.5% in basis points
  const FEE_RECIPIENT = deployer.address; // Change to desired address

  console.log("\nConfiguration:");
  console.log("- Marketplace Fee:", MARKETPLACE_FEE / 100, "%");
  console.log("- Fee Recipient:", FEE_RECIPIENT);

  // Get the contract factory
  const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");

  // Deploy the proxy
  const marketplace = await upgrades.deployProxy(
    NFTMarketplace,
    [MARKETPLACE_FEE, FEE_RECIPIENT],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );

  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();

  console.log("\n✓ NFTMarketplace proxy deployed to:", marketplaceAddress);
  console.log(
    "✓ Implementation deployed to:",
    await upgrades.erc1967.getImplementationAddress(marketplaceAddress)
  );
  console.log(
    "✓ Admin address:",
    await upgrades.erc1967.getAdminAddress(marketplaceAddress)
  );

  // Verify deployment
  console.log("\nVerifying deployment...");
  const marketplaceFee = await marketplace.marketplaceFee();
  const feeRecipient = await marketplace.feeRecipient();
  const totalListings = await marketplace.getTotalListings();
  const totalAuctions = await marketplace.getTotalAuctions();

  console.log("- Marketplace Fee:", marketplaceFee.toString(), "basis points");
  console.log("- Fee Recipient:", feeRecipient);
  console.log("- Total Listings:", totalListings.toString());
  console.log("- Total Auctions:", totalAuctions.toString());

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    marketplace: {
      proxy: marketplaceAddress,
      implementation: await upgrades.erc1967.getImplementationAddress(
        marketplaceAddress
      ),
      admin: await upgrades.erc1967.getAdminAddress(marketplaceAddress),
    },
    config: {
      marketplaceFee: MARKETPLACE_FEE,
      feeRecipient: FEE_RECIPIENT,
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  console.log("\n=== Deployment Info ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Save to file
  const fs = require("fs");
  fs.writeFileSync(
    `deployment-marketplace-${network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(
    `\n✓ Deployment info saved to deployment-marketplace-${network.name}.json`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

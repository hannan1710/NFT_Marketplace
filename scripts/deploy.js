// Hardhat deployment script for NFTContract
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying NFTContract with UUPS proxy...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Configuration parameters
  const NAME = "MyNFTCollection";
  const SYMBOL = "MNFT";
  const BASE_URI = "ipfs://YOUR_CID_HERE/";
  const MAX_SUPPLY = 10000;
  const ROYALTY_RECEIVER = deployer.address; // Change to desired address
  const ROYALTY_FEE = 500; // 5% in basis points (500/10000)

  // Get the contract factory
  const NFTContract = await ethers.getContractFactory("NFTContract");

  // Deploy the proxy
  const nftContract = await upgrades.deployProxy(
    NFTContract,
    [NAME, SYMBOL, BASE_URI, MAX_SUPPLY, ROYALTY_RECEIVER, ROYALTY_FEE],
    {
      initializer: "initialize",
      kind: "uups",
      txOverrides: { gasLimit: 15000000 }, // Set explicit gas limit
    }
  );

  await nftContract.waitForDeployment();
  const nftAddress = await nftContract.getAddress();

  console.log("NFTContract proxy deployed to:", nftAddress);
  console.log("Implementation deployed to:", await upgrades.erc1967.getImplementationAddress(nftAddress));
  console.log("Admin address:", await upgrades.erc1967.getAdminAddress(nftAddress));

  // Verify deployment
  console.log("\nVerifying deployment...");
  const totalSupply = await nftContract.totalSupply();
  const maxSupply = await nftContract.maxSupply();
  console.log("Total Supply:", totalSupply.toString());
  console.log("Max Supply:", maxSupply.toString());

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    contracts: {
      NFTContract: {
        proxy: nftAddress,
        implementation: await upgrades.erc1967.getImplementationAddress(nftAddress),
        admin: await upgrades.erc1967.getAdminAddress(nftAddress),
      }
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  console.log("\nDeployment Info:", JSON.stringify(deploymentInfo, null, 2));
  
  // Save to file
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const filename = `${network.name}-latest.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n✅ Deployment info saved to: deployments/${filename}`);
  
  // Auto-grant admin role to specified address
  const autoAdminAddress = process.env.AUTO_ADMIN_ADDRESS;
  if (autoAdminAddress) {
    console.log(`\n🔐 Auto-granting admin role to: ${autoAdminAddress}`);
    
    const DEFAULT_ADMIN_ROLE = await nftContract.DEFAULT_ADMIN_ROLE();
    const MINTER_ROLE = await nftContract.MINTER_ROLE();
    
    const tx1 = await nftContract.grantRole(DEFAULT_ADMIN_ROLE, autoAdminAddress, { gasLimit: 15000000 });
    await tx1.wait();
    
    const tx2 = await nftContract.grantRole(MINTER_ROLE, autoAdminAddress, { gasLimit: 15000000 });
    await tx2.wait();
    
    console.log(`✅ Admin role granted to: ${autoAdminAddress}`);
  }
  
  console.log("\n📋 Next steps:");
  console.log("  1. Grant admin role:");
  console.log(`     npx hardhat run scripts/grantAdminRole.js --network ${network.name}`);
  console.log("  2. Update frontend .env with contract address:");
  console.log(`     NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=${nftAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

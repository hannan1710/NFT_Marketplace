const { ethers } = require("hardhat");

async function main() {
  const nftAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const grantTo = "0xE7c2BA1d96EA2a1c52e3d2e7c2aeFC3fbB822535";
  
  const NFT = await ethers.getContractAt("NFTContract", nftAddress);
  
  const ADMIN_ROLE = await NFT.ADMIN_ROLE();
  const MINTER_ROLE = await NFT.MINTER_ROLE();
  
  console.log("Granting ADMIN_ROLE to:", grantTo);
  const tx1 = await NFT.grantRole(ADMIN_ROLE, grantTo);
  await tx1.wait();
  console.log("✅ ADMIN_ROLE granted!");
  
  console.log("\nGranting MINTER_ROLE to:", grantTo);
  const tx2 = await NFT.grantRole(MINTER_ROLE, grantTo);
  await tx2.wait();
  console.log("✅ MINTER_ROLE granted!");
  
  console.log("\nRole Status:");
  console.log("Has ADMIN_ROLE:", await NFT.hasRole(ADMIN_ROLE, grantTo));
  console.log("Has MINTER_ROLE:", await NFT.hasRole(MINTER_ROLE, grantTo));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

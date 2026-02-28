const { ethers } = require("hardhat");

async function main() {
  const nftAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const checkAddress = "0xE7c2BA1d96EA2a1c52e3d2e7c2aeFC3fbB822535";
  
  const NFT = await ethers.getContractAt("NFTContract", nftAddress);
  
  const DEFAULT_ADMIN_ROLE = await NFT.DEFAULT_ADMIN_ROLE();
  const ADMIN_ROLE = await NFT.ADMIN_ROLE();
  const MINTER_ROLE = await NFT.MINTER_ROLE();
  
  console.log("Checking roles for:", checkAddress);
  console.log("Has DEFAULT_ADMIN_ROLE:", await NFT.hasRole(DEFAULT_ADMIN_ROLE, checkAddress));
  console.log("Has ADMIN_ROLE:", await NFT.hasRole(ADMIN_ROLE, checkAddress));
  console.log("Has MINTER_ROLE:", await NFT.hasRole(MINTER_ROLE, checkAddress));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

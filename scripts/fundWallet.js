const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const targetWallet = "0xE7c2BA1d96EA2a1c52e3d2e7c2aeFC3fbB822535";
  
  console.log("Funding wallet with test ETH...");
  console.log("From:", deployer.address);
  console.log("To:", targetWallet);
  
  const balanceBefore = await ethers.provider.getBalance(targetWallet);
  console.log("\nBalance before:", ethers.formatEther(balanceBefore), "ETH");
  
  // Send 1000 ETH
  const tx = await deployer.sendTransaction({
    to: targetWallet,
    value: ethers.parseEther("1000")
  });
  
  await tx.wait();
  console.log("✅ Transaction sent:", tx.hash);
  
  const balanceAfter = await ethers.provider.getBalance(targetWallet);
  console.log("\nBalance after:", ethers.formatEther(balanceAfter), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

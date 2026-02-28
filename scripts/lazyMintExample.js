// Complete example of lazy minting workflow
const { ethers } = require("hardhat");
const { createVoucher, verifyVoucherSignature } = require("./createVoucher");

async function main() {
  console.log("=== Lazy Minting Example ===\n");

  // Get signers
  const [deployer, signer, buyer1, buyer2] = await ethers.getSigners();

  console.log("Accounts:");
  console.log("- Deployer:", deployer.address);
  console.log("- Signer:", signer.address);
  console.log("- Buyer 1:", buyer1.address);
  console.log("- Buyer 2:", buyer2.address);
  console.log();

  // Get deployed contract (update with your contract address)
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x...";
  const NFTContract = await ethers.getContractFactory("NFTContract");
  const nftContract = NFTContract.attach(CONTRACT_ADDRESS);

  const contractName = await nftContract.name();
  console.log("Contract:", contractName, "at", CONTRACT_ADDRESS);
  console.log();

  // Grant SIGNER_ROLE to signer account
  const SIGNER_ROLE = await nftContract.SIGNER_ROLE();
  const hasSigner = await nftContract.hasRole(SIGNER_ROLE, signer.address);
  
  if (!hasSigner) {
    console.log("Granting SIGNER_ROLE to signer...");
    await nftContract.grantRole(SIGNER_ROLE, signer.address);
    console.log("✓ SIGNER_ROLE granted\n");
  }

  // Example 1: Create voucher for anyone to redeem
  console.log("=== Example 1: Public Voucher (Anyone Can Redeem) ===");
  const publicVoucher = await createVoucher(
    {
      contractAddress: CONTRACT_ADDRESS,
      contractName: contractName,
      tokenId: 100,
      minPrice: "0.1",
      uri: "ipfs://QmPublicToken100",
      buyer: ethers.constants.AddressZero, // Anyone can redeem
      nonce: Date.now(),
      expiry: 0, // No expiry
    },
    signer
  );

  console.log("Created public voucher:");
  console.log("- Token ID:", publicVoucher.tokenId.toString());
  console.log("- Min Price:", ethers.utils.formatEther(publicVoucher.minPrice), "ETH");
  console.log("- Buyer: Anyone");
  console.log("- Nonce:", publicVoucher.nonce.toString());
  console.log();

  // Verify voucher on-chain
  const [recoveredSigner1, isValid1] = await nftContract.verifyVoucher(publicVoucher);
  console.log("On-chain verification:");
  console.log("- Signer:", recoveredSigner1);
  console.log("- Valid:", isValid1);
  console.log();

  // Redeem voucher
  console.log("Buyer 1 redeeming voucher...");
  const tx1 = await nftContract.connect(buyer1).redeemVoucher(publicVoucher, {
    value: ethers.utils.parseEther("0.1"),
  });
  await tx1.wait();
  console.log("✓ Token minted to:", buyer1.address);
  console.log("✓ Transaction:", tx1.hash);
  console.log();

  // Example 2: Create voucher for specific buyer
  console.log("=== Example 2: Restricted Voucher (Specific Buyer) ===");
  const restrictedVoucher = await createVoucher(
    {
      contractAddress: CONTRACT_ADDRESS,
      contractName: contractName,
      tokenId: 101,
      minPrice: "0.05",
      uri: "ipfs://QmRestrictedToken101",
      buyer: buyer2.address, // Only buyer2 can redeem
      nonce: Date.now() + 1,
      expiry: 0,
    },
    signer
  );

  console.log("Created restricted voucher:");
  console.log("- Token ID:", restrictedVoucher.tokenId.toString());
  console.log("- Min Price:", ethers.utils.formatEther(restrictedVoucher.minPrice), "ETH");
  console.log("- Buyer:", buyer2.address);
  console.log();

  // Try to redeem with wrong buyer (should fail)
  console.log("Buyer 1 trying to redeem (should fail)...");
  try {
    await nftContract.connect(buyer1).redeemVoucher(restrictedVoucher, {
      value: ethers.utils.parseEther("0.05"),
    });
  } catch (error) {
    console.log("✓ Failed as expected:", error.message.split("(")[0]);
  }
  console.log();

  // Redeem with correct buyer
  console.log("Buyer 2 redeeming voucher...");
  const tx2 = await nftContract.connect(buyer2).redeemVoucher(restrictedVoucher, {
    value: ethers.utils.parseEther("0.05"),
  });
  await tx2.wait();
  console.log("✓ Token minted to:", buyer2.address);
  console.log("✓ Transaction:", tx2.hash);
  console.log();

  // Example 3: Create voucher with expiry
  console.log("=== Example 3: Time-Limited Voucher ===");
  const currentTime = Math.floor(Date.now() / 1000);
  const expiryTime = currentTime + 3600; // Expires in 1 hour

  const timedVoucher = await createVoucher(
    {
      contractAddress: CONTRACT_ADDRESS,
      contractName: contractName,
      tokenId: 102,
      minPrice: "0.2",
      uri: "ipfs://QmTimedToken102",
      buyer: ethers.constants.AddressZero,
      nonce: Date.now() + 2,
      expiry: expiryTime,
    },
    signer
  );

  console.log("Created time-limited voucher:");
  console.log("- Token ID:", timedVoucher.tokenId.toString());
  console.log("- Expires:", new Date(expiryTime * 1000).toLocaleString());
  console.log();

  // Verify it's valid now
  const [, isValid3] = await nftContract.verifyVoucher(timedVoucher);
  console.log("Current validity:", isValid3);
  console.log();

  // Example 4: Batch create vouchers
  console.log("=== Example 4: Batch Voucher Creation ===");
  const batchVouchers = [];
  
  for (let i = 0; i < 5; i++) {
    const voucher = await createVoucher(
      {
        contractAddress: CONTRACT_ADDRESS,
        contractName: contractName,
        tokenId: 200 + i,
        minPrice: "0.01",
        uri: `ipfs://QmBatchToken${200 + i}`,
        buyer: ethers.constants.AddressZero,
        nonce: Date.now() + 10 + i,
        expiry: 0,
      },
      signer
    );
    batchVouchers.push(voucher);
  }

  console.log(`Created ${batchVouchers.length} vouchers for tokens 200-204`);
  console.log();

  // Save vouchers to file
  const fs = require("fs");
  const vouchersData = batchVouchers.map((v) => ({
    tokenId: v.tokenId.toString(),
    minPrice: v.minPrice.toString(),
    uri: v.uri,
    buyer: v.buyer,
    nonce: v.nonce.toString(),
    expiry: v.expiry.toString(),
    signature: v.signature,
  }));

  fs.writeFileSync(
    "batch-vouchers.json",
    JSON.stringify(vouchersData, null, 2)
  );
  console.log("✓ Batch vouchers saved to batch-vouchers.json");
  console.log();

  // Check contract balance
  const contractBalance = await ethers.provider.getBalance(CONTRACT_ADDRESS);
  console.log("=== Contract Status ===");
  console.log("Contract Balance:", ethers.utils.formatEther(contractBalance), "ETH");
  console.log("Total Supply:", (await nftContract.totalSupply()).toString());
  console.log("Max Supply:", (await nftContract.maxSupply()).toString());
  console.log();

  // Example 5: Nonce management
  console.log("=== Example 5: Nonce Management ===");
  const testNonce = Date.now() + 100;
  
  console.log("Checking nonce", testNonce, "for signer...");
  const isUsed = await nftContract.isNonceUsed(signer.address, testNonce);
  console.log("Nonce used:", isUsed);
  
  console.log("Invalidating nonce manually...");
  const tx3 = await nftContract.connect(signer).invalidateNonce(testNonce);
  await tx3.wait();
  
  const isUsedNow = await nftContract.isNonceUsed(signer.address, testNonce);
  console.log("Nonce used now:", isUsedNow);
  console.log();

  console.log("=== Example Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

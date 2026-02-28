// Complete example of marketplace interactions
const { ethers } = require("hardhat");

async function main() {
  console.log("=== NFT Marketplace Example ===\n");

  // Get signers
  const [deployer, seller, buyer1, buyer2] = await ethers.getSigners();

  console.log("Accounts:");
  console.log("- Deployer:", deployer.address);
  console.log("- Seller:", seller.address);
  console.log("- Buyer 1:", buyer1.address);
  console.log("- Buyer 2:", buyer2.address);
  console.log();

  // Get deployed contracts (update with your addresses)
  const NFT_CONTRACT_ADDRESS = process.env.NFT_CONTRACT_ADDRESS || "0x...";
  const MARKETPLACE_ADDRESS = process.env.MARKETPLACE_ADDRESS || "0x...";

  const NFTContract = await ethers.getContractFactory("NFTContract");
  const nftContract = NFTContract.attach(NFT_CONTRACT_ADDRESS);

  const Marketplace = await ethers.getContractFactory("NFTMarketplace");
  const marketplace = Marketplace.attach(MARKETPLACE_ADDRESS);

  console.log("Contracts:");
  console.log("- NFT:", NFT_CONTRACT_ADDRESS);
  console.log("- Marketplace:", MARKETPLACE_ADDRESS);
  console.log();

  // Check if seller has MINTER_ROLE
  const MINTER_ROLE = await nftContract.MINTER_ROLE();
  const hasMinterRole = await nftContract.hasRole(MINTER_ROLE, seller.address);

  if (!hasMinterRole) {
    console.log("Granting MINTER_ROLE to seller...");
    await nftContract.grantRole(MINTER_ROLE, seller.address);
    console.log("✓ MINTER_ROLE granted\n");
  }

  // Mint NFTs to seller
  console.log("=== Minting NFTs ===");
  const tx1 = await nftContract.connect(seller).mint(seller.address);
  await tx1.wait();
  const tokenId1 = 0; // First token

  const tx2 = await nftContract.connect(seller).mint(seller.address);
  await tx2.wait();
  const tokenId2 = 1; // Second token

  console.log("✓ Minted token", tokenId1, "to seller");
  console.log("✓ Minted token", tokenId2, "to seller");
  console.log();

  // Approve marketplace
  console.log("=== Approving Marketplace ===");
  await nftContract
    .connect(seller)
    .setApprovalForAll(marketplace.address, true);
  console.log("✓ Marketplace approved for all tokens\n");

  // Example 1: Create Fixed Price Listing
  console.log("=== Example 1: Fixed Price Listing ===");
  const listingPrice = ethers.utils.parseEther("0.5");

  const createListingTx = await marketplace
    .connect(seller)
    .createListing(NFT_CONTRACT_ADDRESS, tokenId1, listingPrice);

  const createListingReceipt = await createListingTx.wait();
  const listingEvent = createListingReceipt.events.find(
    (e) => e.event === "ListingCreated"
  );
  const listingId = listingEvent.args.listingId;

  console.log("Created listing:");
  console.log("- Listing ID:", listingId.toString());
  console.log("- Token ID:", tokenId1);
  console.log("- Price:", ethers.utils.formatEther(listingPrice), "ETH");
  console.log();

  // Get listing details
  const listing = await marketplace.getListing(listingId);
  console.log("Listing details:");
  console.log("- Seller:", listing.seller);
  console.log("- Active:", listing.active);
  console.log();

  // Purchase listing
  console.log("Buyer 1 purchasing listing...");
  const buyer1BalanceBefore = await ethers.provider.getBalance(buyer1.address);

  const purchaseTx = await marketplace
    .connect(buyer1)
    .purchaseListing(listingId, { value: listingPrice });

  const purchaseReceipt = await purchaseTx.wait();
  console.log("✓ Purchase successful");
  console.log("✓ Transaction:", purchaseTx.hash);

  // Verify ownership
  const newOwner = await nftContract.ownerOf(tokenId1);
  console.log("✓ New owner:", newOwner);
  console.log();

  // Example 2: Create Auction
  console.log("=== Example 2: English Auction ===");
  const startPrice = ethers.utils.parseEther("0.3");
  const duration = 3600; // 1 hour

  const createAuctionTx = await marketplace
    .connect(seller)
    .createAuction(NFT_CONTRACT_ADDRESS, tokenId2, startPrice, duration);

  const createAuctionReceipt = await createAuctionTx.wait();
  const auctionEvent = createAuctionReceipt.events.find(
    (e) => e.event === "AuctionCreated"
  );
  const auctionId = auctionEvent.args.auctionId;

  console.log("Created auction:");
  console.log("- Auction ID:", auctionId.toString());
  console.log("- Token ID:", tokenId2);
  console.log("- Start Price:", ethers.utils.formatEther(startPrice), "ETH");
  console.log("- Duration:", duration, "seconds");
  console.log();

  // Get auction details
  const auction = await marketplace.getAuction(auctionId);
  console.log("Auction details:");
  console.log("- Seller:", auction.seller);
  console.log("- Start Time:", new Date(auction.startTime * 1000).toLocaleString());
  console.log("- End Time:", new Date(auction.endTime * 1000).toLocaleString());
  console.log("- Active:", auction.active);
  console.log();

  // Place bids
  console.log("=== Placing Bids ===");
  const bid1 = ethers.utils.parseEther("0.35");
  console.log("Buyer 1 placing bid:", ethers.utils.formatEther(bid1), "ETH");

  await marketplace.connect(buyer1).placeBid(auctionId, { value: bid1 });
  console.log("✓ Bid placed");

  let auctionState = await marketplace.getAuction(auctionId);
  console.log("- Current bid:", ethers.utils.formatEther(auctionState.currentBid), "ETH");
  console.log("- Current bidder:", auctionState.currentBidder);
  console.log();

  // Buyer 2 outbids
  const bid2 = ethers.utils.parseEther("0.4");
  console.log("Buyer 2 placing higher bid:", ethers.utils.formatEther(bid2), "ETH");

  const buyer1BalanceBeforeBid = await ethers.provider.getBalance(buyer1.address);

  await marketplace.connect(buyer2).placeBid(auctionId, { value: bid2 });
  console.log("✓ Bid placed");

  const buyer1BalanceAfterBid = await ethers.provider.getBalance(buyer1.address);
  console.log(
    "✓ Buyer 1 refunded:",
    ethers.utils.formatEther(buyer1BalanceAfterBid.sub(buyer1BalanceBeforeBid)),
    "ETH"
  );

  auctionState = await marketplace.getAuction(auctionId);
  console.log("- Current bid:", ethers.utils.formatEther(auctionState.currentBid), "ETH");
  console.log("- Current bidder:", auctionState.currentBidder);
  console.log();

  // Fast forward time (only works in local/test networks)
  if (network.name === "hardhat" || network.name === "localhost") {
    console.log("=== Fast Forwarding Time ===");
    await ethers.provider.send("evm_increaseTime", [duration + 1]);
    await ethers.provider.send("evm_mine");
    console.log("✓ Time advanced past auction end\n");

    // Finalize auction
    console.log("=== Finalizing Auction ===");
    const finalizeTx = await marketplace.finalizeAuction(auctionId);
    await finalizeTx.wait();
    console.log("✓ Auction finalized");
    console.log("✓ Transaction:", finalizeTx.hash);

    // Verify ownership
    const auctionWinner = await nftContract.ownerOf(tokenId2);
    console.log("✓ Winner:", auctionWinner);
    console.log();
  } else {
    console.log("Note: Auction finalization requires waiting for duration to pass");
    console.log("Run `marketplace.finalizeAuction(${auctionId})` after auction ends");
    console.log();
  }

  // Display marketplace stats
  console.log("=== Marketplace Statistics ===");
  const totalListings = await marketplace.getTotalListings();
  const totalAuctions = await marketplace.getTotalAuctions();
  const marketplaceFee = await marketplace.marketplaceFee();
  const feeRecipient = await marketplace.feeRecipient();

  console.log("- Total Listings Created:", totalListings.toString());
  console.log("- Total Auctions Created:", totalAuctions.toString());
  console.log("- Marketplace Fee:", marketplaceFee.toString(), "basis points");
  console.log("- Fee Recipient:", feeRecipient);
  console.log();

  console.log("=== Example Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

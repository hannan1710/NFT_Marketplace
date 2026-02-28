const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("NFTMarketplace", function () {
  let marketplace;
  let nftContract;
  let owner, seller, buyer1, buyer2, feeRecipient;
  let ADMIN_ROLE;

  const MARKETPLACE_FEE = 250; // 2.5%
  const ROYALTY_FEE = 500; // 5%
  const NFT_PRICE = ethers.utils.parseEther("1.0");
  const AUCTION_START_PRICE = ethers.utils.parseEther("0.5");
  const AUCTION_DURATION = 86400; // 24 hours

  beforeEach(async function () {
    [owner, seller, buyer1, buyer2, feeRecipient] = await ethers.getSigners();

    // Deploy NFT contract
    const NFTContract = await ethers.getContractFactory("NFTContract");
    nftContract = await upgrades.deployProxy(
      NFTContract,
      [
        "TestNFT",
        "TNFT",
        "ipfs://test/",
        10000,
        seller.address,
        ROYALTY_FEE,
      ],
      { initializer: "initialize", kind: "uups" }
    );
    await nftContract.deployed();

    // Deploy Marketplace
    const Marketplace = await ethers.getContractFactory("NFTMarketplace");
    marketplace = await upgrades.deployProxy(
      Marketplace,
      [MARKETPLACE_FEE, feeRecipient.address],
      { initializer: "initialize", kind: "uups" }
    );
    await marketplace.deployed();

    ADMIN_ROLE = await marketplace.ADMIN_ROLE();

    // Mint NFTs to seller
    await nftContract.mint(seller.address); // Token ID 0
    await nftContract.mint(seller.address); // Token ID 1
    await nftContract.mint(seller.address); // Token ID 2
  });

  describe("Initialization", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await marketplace.marketplaceFee()).to.equal(MARKETPLACE_FEE);
      expect(await marketplace.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should grant ADMIN_ROLE to deployer", async function () {
      expect(await marketplace.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should reject invalid marketplace fee", async function () {
      const Marketplace = await ethers.getContractFactory("NFTMarketplace");
      await expect(
        upgrades.deployProxy(
          Marketplace,
          [1001, feeRecipient.address], // > 10%
          { initializer: "initialize", kind: "uups" }
        )
      ).to.be.reverted;
    });
  });

  describe("Fixed Price Listings", function () {
    beforeEach(async function () {
      // Approve marketplace to transfer NFT
      await nftContract
        .connect(seller)
        .setApprovalForAll(marketplace.address, true);
    });

    it("Should create a listing", async function () {
      await expect(
        marketplace.connect(seller).createListing(nftContract.address, 0, NFT_PRICE)
      )
        .to.emit(marketplace, "ListingCreated")
        .withArgs(0, nftContract.address, 0, seller.address, NFT_PRICE);

      const listing = await marketplace.getListing(0);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(NFT_PRICE);
      expect(listing.active).to.be.true;
    });

    it("Should fail to create listing without approval", async function () {
      await nftContract
        .connect(seller)
        .setApprovalForAll(marketplace.address, false);

      await expect(
        marketplace.connect(seller).createListing(nftContract.address, 0, NFT_PRICE)
      ).to.be.revertedWithCustomError(marketplace, "NotApproved");
    });

    it("Should fail to create listing if not owner", async function () {
      await expect(
        marketplace.connect(buyer1).createListing(nftContract.address, 0, NFT_PRICE)
      ).to.be.revertedWithCustomError(marketplace, "NotTokenOwner");
    });

    it("Should purchase a listing", async function () {
      await marketplace
        .connect(seller)
        .createListing(nftContract.address, 0, NFT_PRICE);

      const sellerBalanceBefore = await ethers.provider.getBalance(
        seller.address
      );
      const feeRecipientBalanceBefore = await ethers.provider.getBalance(
        feeRecipient.address
      );

      await expect(
        marketplace.connect(buyer1).purchaseListing(0, { value: NFT_PRICE })
      )
        .to.emit(marketplace, "ListingPurchased")
        .withArgs(0, buyer1.address, NFT_PRICE, ethers.utils.parseEther("0.025"), ethers.utils.parseEther("0.05"));

      // Verify NFT transferred
      expect(await nftContract.ownerOf(0)).to.equal(buyer1.address);

      // Verify listing is inactive
      const listing = await marketplace.getListing(0);
      expect(listing.active).to.be.false;

      // Verify payments
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      const feeRecipientBalanceAfter = await ethers.provider.getBalance(
        feeRecipient.address
      );

      // Seller should receive price - marketplace fee - royalty
      const expectedSellerProceeds = NFT_PRICE.sub(
        ethers.utils.parseEther("0.025")
      ).sub(ethers.utils.parseEther("0.05"));

      expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.equal(
        expectedSellerProceeds
      );

      // Fee recipient should receive marketplace fee
      expect(
        feeRecipientBalanceAfter.sub(feeRecipientBalanceBefore)
      ).to.equal(ethers.utils.parseEther("0.025"));
    });

    it("Should refund excess payment", async function () {
      await marketplace
        .connect(seller)
        .createListing(nftContract.address, 0, NFT_PRICE);

      const buyerBalanceBefore = await ethers.provider.getBalance(buyer1.address);
      const excessPayment = ethers.utils.parseEther("0.5");

      const tx = await marketplace
        .connect(buyer1)
        .purchaseListing(0, { value: NFT_PRICE.add(excessPayment) });

      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      const buyerBalanceAfter = await ethers.provider.getBalance(buyer1.address);

      // Buyer should only pay NFT_PRICE + gas
      expect(buyerBalanceBefore.sub(buyerBalanceAfter)).to.be.closeTo(
        NFT_PRICE.add(gasUsed),
        ethers.utils.parseEther("0.001")
      );
    });

    it("Should cancel a listing", async function () {
      await marketplace
        .connect(seller)
        .createListing(nftContract.address, 0, NFT_PRICE);

      await expect(marketplace.connect(seller).cancelListing(0))
        .to.emit(marketplace, "ListingCancelled")
        .withArgs(0);

      const listing = await marketplace.getListing(0);
      expect(listing.active).to.be.false;
    });

    it("Should fail to cancel listing if not seller", async function () {
      await marketplace
        .connect(seller)
        .createListing(nftContract.address, 0, NFT_PRICE);

      await expect(
        marketplace.connect(buyer1).cancelListing(0)
      ).to.be.revertedWithCustomError(marketplace, "NotSeller");
    });

    it("Should update listing price", async function () {
      await marketplace
        .connect(seller)
        .createListing(nftContract.address, 0, NFT_PRICE);

      const newPrice = ethers.utils.parseEther("2.0");

      await expect(marketplace.connect(seller).updateListingPrice(0, newPrice))
        .to.emit(marketplace, "ListingPriceUpdated")
        .withArgs(0, newPrice);

      const listing = await marketplace.getListing(0);
      expect(listing.price).to.equal(newPrice);
    });

    it("Should fail to purchase inactive listing", async function () {
      await marketplace
        .connect(seller)
        .createListing(nftContract.address, 0, NFT_PRICE);

      await marketplace.connect(seller).cancelListing(0);

      await expect(
        marketplace.connect(buyer1).purchaseListing(0, { value: NFT_PRICE })
      ).to.be.revertedWithCustomError(marketplace, "ListingNotActive");
    });
  });

  describe("Auctions", function () {
    beforeEach(async function () {
      await nftContract
        .connect(seller)
        .setApprovalForAll(marketplace.address, true);
    });

    it("Should create an auction", async function () {
      const tx = await marketplace
        .connect(seller)
        .createAuction(
          nftContract.address,
          0,
          AUCTION_START_PRICE,
          AUCTION_DURATION
        );

      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(marketplace, "AuctionCreated")
        .withArgs(
          0,
          nftContract.address,
          0,
          seller.address,
          AUCTION_START_PRICE,
          block.timestamp,
          block.timestamp + AUCTION_DURATION
        );

      const auction = await marketplace.getAuction(0);
      expect(auction.seller).to.equal(seller.address);
      expect(auction.startPrice).to.equal(AUCTION_START_PRICE);
      expect(auction.active).to.be.true;
    });

    it("Should place a bid", async function () {
      await marketplace
        .connect(seller)
        .createAuction(
          nftContract.address,
          0,
          AUCTION_START_PRICE,
          AUCTION_DURATION
        );

      const bidAmount = ethers.utils.parseEther("0.6");

      await expect(
        marketplace.connect(buyer1).placeBid(0, { value: bidAmount })
      ).to.emit(marketplace, "BidPlaced");

      const auction = await marketplace.getAuction(0);
      expect(auction.currentBid).to.equal(bidAmount);
      expect(auction.currentBidder).to.equal(buyer1.address);
    });

    it("Should refund previous bidder when outbid", async function () {
      await marketplace
        .connect(seller)
        .createAuction(
          nftContract.address,
          0,
          AUCTION_START_PRICE,
          AUCTION_DURATION
        );

      const bid1 = ethers.utils.parseEther("0.6");
      const bid2 = ethers.utils.parseEther("0.7");

      await marketplace.connect(buyer1).placeBid(0, { value: bid1 });

      const buyer1BalanceBefore = await ethers.provider.getBalance(
        buyer1.address
      );

      await marketplace.connect(buyer2).placeBid(0, { value: bid2 });

      const buyer1BalanceAfter = await ethers.provider.getBalance(
        buyer1.address
      );

      // Buyer1 should be refunded
      expect(buyer1BalanceAfter.sub(buyer1BalanceBefore)).to.equal(bid1);
    });

    it("Should fail to bid below minimum", async function () {
      await marketplace
        .connect(seller)
        .createAuction(
          nftContract.address,
          0,
          AUCTION_START_PRICE,
          AUCTION_DURATION
        );

      const lowBid = ethers.utils.parseEther("0.4");

      await expect(
        marketplace.connect(buyer1).placeBid(0, { value: lowBid })
      ).to.be.revertedWithCustomError(marketplace, "BidTooLow");
    });

    it("Should fail to bid on own auction", async function () {
      await marketplace
        .connect(seller)
        .createAuction(
          nftContract.address,
          0,
          AUCTION_START_PRICE,
          AUCTION_DURATION
        );

      await expect(
        marketplace
          .connect(seller)
          .placeBid(0, { value: AUCTION_START_PRICE })
      ).to.be.revertedWithCustomError(marketplace, "CannotBidOnOwnAuction");
    });

    it("Should finalize auction with winner", async function () {
      await marketplace
        .connect(seller)
        .createAuction(
          nftContract.address,
          0,
          AUCTION_START_PRICE,
          AUCTION_DURATION
        );

      const bidAmount = ethers.utils.parseEther("0.6");
      await marketplace.connect(buyer1).placeBid(0, { value: bidAmount });

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [AUCTION_DURATION + 1]);
      await ethers.provider.send("evm_mine");

      const sellerBalanceBefore = await ethers.provider.getBalance(
        seller.address
      );

      await expect(marketplace.finalizeAuction(0))
        .to.emit(marketplace, "AuctionFinalized")
        .withArgs(
          0,
          buyer1.address,
          bidAmount,
          ethers.utils.parseEther("0.015"),
          ethers.utils.parseEther("0.03")
        );

      // Verify NFT transferred
      expect(await nftContract.ownerOf(0)).to.equal(buyer1.address);

      // Verify auction is inactive
      const auction = await marketplace.getAuction(0);
      expect(auction.active).to.be.false;

      // Verify seller received payment
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      expect(sellerBalanceAfter).to.be.gt(sellerBalanceBefore);
    });

    it("Should cancel auction with no bids", async function () {
      await marketplace
        .connect(seller)
        .createAuction(
          nftContract.address,
          0,
          AUCTION_START_PRICE,
          AUCTION_DURATION
        );

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [AUCTION_DURATION + 1]);
      await ethers.provider.send("evm_mine");

      await expect(marketplace.finalizeAuction(0))
        .to.emit(marketplace, "AuctionCancelled")
        .withArgs(0);

      // NFT should still belong to seller
      expect(await nftContract.ownerOf(0)).to.equal(seller.address);
    });

    it("Should allow seller to cancel auction with no bids", async function () {
      await marketplace
        .connect(seller)
        .createAuction(
          nftContract.address,
          0,
          AUCTION_START_PRICE,
          AUCTION_DURATION
        );

      await expect(marketplace.connect(seller).cancelAuction(0))
        .to.emit(marketplace, "AuctionCancelled")
        .withArgs(0);

      const auction = await marketplace.getAuction(0);
      expect(auction.active).to.be.false;
    });

    it("Should fail to cancel auction with bids", async function () {
      await marketplace
        .connect(seller)
        .createAuction(
          nftContract.address,
          0,
          AUCTION_START_PRICE,
          AUCTION_DURATION
        );

      await marketplace
        .connect(buyer1)
        .placeBid(0, { value: AUCTION_START_PRICE });

      await expect(
        marketplace.connect(seller).cancelAuction(0)
      ).to.be.revertedWithCustomError(marketplace, "InvalidParameters");
    });

    it("Should fail to finalize before auction ends", async function () {
      await marketplace
        .connect(seller)
        .createAuction(
          nftContract.address,
          0,
          AUCTION_START_PRICE,
          AUCTION_DURATION
        );

      await marketplace
        .connect(buyer1)
        .placeBid(0, { value: AUCTION_START_PRICE });

      await expect(
        marketplace.finalizeAuction(0)
      ).to.be.revertedWithCustomError(marketplace, "AuctionNotEnded");
    });

    it("Should fail to bid after auction ends", async function () {
      await marketplace
        .connect(seller)
        .createAuction(
          nftContract.address,
          0,
          AUCTION_START_PRICE,
          AUCTION_DURATION
        );

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [AUCTION_DURATION + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        marketplace
          .connect(buyer1)
          .placeBid(0, { value: AUCTION_START_PRICE })
      ).to.be.revertedWithCustomError(marketplace, "AuctionEnded");
    });
  });

  describe("Admin Functions", function () {
    it("Should update marketplace fee", async function () {
      const newFee = 300;

      await expect(marketplace.setMarketplaceFee(newFee))
        .to.emit(marketplace, "MarketplaceFeeUpdated")
        .withArgs(newFee);

      expect(await marketplace.marketplaceFee()).to.equal(newFee);
    });

    it("Should fail to set fee above maximum", async function () {
      await expect(
        marketplace.setMarketplaceFee(1001)
      ).to.be.revertedWithCustomError(marketplace, "InvalidParameters");
    });

    it("Should update fee recipient", async function () {
      const newRecipient = buyer1.address;

      await expect(marketplace.setFeeRecipient(newRecipient))
        .to.emit(marketplace, "FeeRecipientUpdated")
        .withArgs(newRecipient);

      expect(await marketplace.feeRecipient()).to.equal(newRecipient);
    });

    it("Should pause and unpause marketplace", async function () {
      await marketplace.pause();

      await nftContract
        .connect(seller)
        .setApprovalForAll(marketplace.address, true);

      await expect(
        marketplace.connect(seller).createListing(nftContract.address, 0, NFT_PRICE)
      ).to.be.revertedWith("Pausable: paused");

      await marketplace.unpause();

      await expect(
        marketplace.connect(seller).createListing(nftContract.address, 0, NFT_PRICE)
      ).to.emit(marketplace, "ListingCreated");
    });

    it("Should fail admin functions without role", async function () {
      await expect(
        marketplace.connect(buyer1).setMarketplaceFee(300)
      ).to.be.reverted;

      await expect(
        marketplace.connect(buyer1).setFeeRecipient(buyer1.address)
      ).to.be.reverted;

      await expect(marketplace.connect(buyer1).pause()).to.be.reverted;
    });
  });

  describe("View Functions", function () {
    it("Should return total listings count", async function () {
      await nftContract
        .connect(seller)
        .setApprovalForAll(marketplace.address, true);

      await marketplace
        .connect(seller)
        .createListing(nftContract.address, 0, NFT_PRICE);

      await marketplace
        .connect(seller)
        .createListing(nftContract.address, 1, NFT_PRICE);

      expect(await marketplace.getTotalListings()).to.equal(2);
    });

    it("Should return total auctions count", async function () {
      await nftContract
        .connect(seller)
        .setApprovalForAll(marketplace.address, true);

      await marketplace
        .connect(seller)
        .createAuction(
          nftContract.address,
          0,
          AUCTION_START_PRICE,
          AUCTION_DURATION
        );

      await marketplace
        .connect(seller)
        .createAuction(
          nftContract.address,
          1,
          AUCTION_START_PRICE,
          AUCTION_DURATION
        );

      expect(await marketplace.getTotalAuctions()).to.equal(2);
    });
  });
});

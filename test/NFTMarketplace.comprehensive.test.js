const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("NFTMarketplace - Comprehensive Test Suite", function () {
  
  // ============ Fixtures ============
  
  async function deployMarketplaceFixture() {
    const [owner, seller, buyer, buyer2, feeRecipient, attacker] = await ethers.getSigners();

    // Deploy NFT Contract
    const NFTContract = await ethers.getContractFactory("NFTContract");
    const nft = await upgrades.deployProxy(
      NFTContract,
      ["Test NFT", "TNFT", "https://api.example.com/", 10000, seller.address, 500],
      { initializer: "initialize", kind: "uups" }
    );
    await nft.waitForDeployment();

    // Deploy Marketplace
    const Marketplace = await ethers.getContractFactory("NFTMarketplace");
    const marketplace = await upgrades.deployProxy(
      Marketplace,
      [250, feeRecipient.address], // 2.5% fee
      { initializer: "initialize", kind: "uups" }
    );
    await marketplace.waitForDeployment();

    // Setup: Mint NFTs to seller
    const MINTER_ROLE = await nft.MINTER_ROLE();
    await nft.grantRole(MINTER_ROLE, owner.address);
    
    for (let i = 0; i < 5; i++) {
      await nft.mint(seller.address);
    }

    const ADMIN_ROLE = await marketplace.ADMIN_ROLE();

    return {
      nft,
      marketplace,
      owner,
      seller,
      buyer,
      buyer2,
      feeRecipient,
      attacker,
      ADMIN_ROLE
    };
  }

  // ============ 1. Listing NFT Transfers to Escrow ============
  
  describe("1. Listing NFT Transfers to Escrow", function () {
    
    it("Should transfer NFT to marketplace on listing creation", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      
      await expect(
        marketplace.connect(seller).createListing(
          await nft.getAddress(),
          0,
          ethers.parseEther("1")
        )
      ).to.emit(marketplace, "ListingCreated");
      
      expect(await nft.ownerOf(0)).to.equal(await marketplace.getAddress());
    });

    it("Should revert if NFT not approved", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployMarketplaceFixture);
      
      await expect(
        marketplace.connect(seller).createListing(
          await nft.getAddress(),
          0,
          ethers.parseEther("1")
        )
      ).to.be.revertedWithCustomError(marketplace, "NotApproved");
    });

    it("Should revert if not NFT owner", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      
      await expect(
        marketplace.connect(buyer).createListing(
          await nft.getAddress(),
          0,
          ethers.parseEther("1")
        )
      ).to.be.revertedWithCustomError(marketplace, "NotTokenOwner");
    });

    it("Should store listing details correctly", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        0,
        ethers.parseEther("1")
      );
      
      const listing = await marketplace.getListing(0);
      expect(listing.nftContract).to.equal(await nft.getAddress());
      expect(listing.tokenId).to.equal(0);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(ethers.parseEther("1"));
      expect(listing.active).to.be.true;
    });

    it("Should increment listing counter", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployMarketplaceFixture);
      
      expect(await marketplace.getTotalListings()).to.equal(0);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        0,
        ethers.parseEther("1")
      );
      
      expect(await marketplace.getTotalListings()).to.equal(1);
    });
  });

  // ============ 2. Successful Buy Transfers Ownership ============
  
  describe("2. Successful Buy Transfers Ownership", function () {
    
    it("Should transfer NFT to buyer on purchase", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        0,
        ethers.parseEther("1")
      );
      
      await marketplace.connect(buyer).purchaseListing(0, { value: ethers.parseEther("1") });
      
      expect(await nft.ownerOf(0)).to.equal(buyer.address);
    });

    it("Should mark listing as inactive after purchase", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        0,
        ethers.parseEther("1")
      );
      
      await marketplace.connect(buyer).purchaseListing(0, { value: ethers.parseEther("1") });
      
      const listing = await marketplace.getListing(0);
      expect(listing.active).to.be.false;
    });

    it("Should emit ListingPurchased event", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        0,
        ethers.parseEther("1")
      );
      
      await expect(
        marketplace.connect(buyer).purchaseListing(0, { value: ethers.parseEther("1") })
      ).to.emit(marketplace, "ListingPurchased")
        .withArgs(0, buyer.address, ethers.parseEther("1"));
    });

    it("Should revert if insufficient payment", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        0,
        ethers.parseEther("1")
      );
      
      await expect(
        marketplace.connect(buyer).purchaseListing(0, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWithCustomError(marketplace, "InsufficientPayment");
    });

    it("Should refund excess payment", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        0,
        ethers.parseEther("1")
      );
      
      const balanceBefore = await ethers.provider.getBalance(buyer.address);
      
      const tx = await marketplace.connect(buyer).purchaseListing(0, { value: ethers.parseEther("2") });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const balanceAfter = await ethers.provider.getBalance(buyer.address);
      
      // Should only pay 1 ETH + gas
      expect(balanceBefore - balanceAfter).to.be.closeTo(
        ethers.parseEther("1") + gasUsed,
        ethers.parseEther("0.001")
      );
    });
  });

  // ============ 3. Fee Calculation Correctness ============
  
  describe("3. Fee Calculation Correctness", function () {
    
    it("Should calculate 2.5% marketplace fee correctly", async function () {
      const { nft, marketplace, seller, buyer, feeRecipient } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        0,
        ethers.parseEther("1")
      );
      
      const balanceBefore = await ethers.provider.getBalance(feeRecipient.address);
      
      await marketplace.connect(buyer).purchaseListing(0, { value: ethers.parseEther("1") });
      
      const balanceAfter = await ethers.provider.getBalance(feeRecipient.address);
      
      // 2.5% of 1 ETH = 0.025 ETH
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("0.025"));
    });

    it("Should calculate fees for different prices", async function () {
      const { nft, marketplace, seller, buyer, feeRecipient } = await loadFixture(deployMarketplaceFixture);
      
      const testCases = [
        { price: ethers.parseEther("10"), expectedFee: ethers.parseEther("0.25") },
        { price: ethers.parseEther("0.1"), expectedFee: ethers.parseEther("0.0025") },
        { price: ethers.parseEther("100"), expectedFee: ethers.parseEther("2.5") }
      ];
      
      for (let i = 0; i < testCases.length; i++) {
        await nft.connect(seller).approve(await marketplace.getAddress(), i);
        await marketplace.connect(seller).createListing(
          await nft.getAddress(),
          i,
          testCases[i].price
        );
        
        const balanceBefore = await ethers.provider.getBalance(feeRecipient.address);
        
        await marketplace.connect(buyer).purchaseListing(i, { value: testCases[i].price });
        
        const balanceAfter = await ethers.provider.getBalance(feeRecipient.address);
        
        expect(balanceAfter - balanceBefore).to.equal(testCases[i].expectedFee);
      }
    });

    it("Should allow admin to update marketplace fee", async function () {
      const { marketplace, owner } = await loadFixture(deployMarketplaceFixture);
      
      await marketplace.setMarketplaceFee(500); // 5%
      
      expect(await marketplace.marketplaceFee()).to.equal(500);
    });

    it("Should reject fee above maximum", async function () {
      const { marketplace, owner } = await loadFixture(deployMarketplaceFixture);
      
      await expect(
        marketplace.setMarketplaceFee(1001) // 10.01%
      ).to.be.revertedWithCustomError(marketplace, "InvalidParameters");
    });
  });

  // ============ 4. Royalty Distribution Correctness ============
  
  describe("4. Royalty Distribution Correctness", function () {
    
    it("Should distribute 5% royalty to creator", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        0,
        ethers.parseEther("1")
      );
      
      const balanceBefore = await ethers.provider.getBalance(seller.address);
      
      await marketplace.connect(buyer).purchaseListing(0, { value: ethers.parseEther("1") });
      
      const balanceAfter = await ethers.provider.getBalance(seller.address);
      
      // Seller gets: 1 ETH - 2.5% marketplace fee - 5% royalty + 5% royalty = 1 ETH - 2.5%
      // Actually seller is also creator, so gets back the royalty
      // Total: 1 - 0.025 = 0.975 ETH
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("0.975"));
    });

    it("Should distribute royalty to different creator", async function () {
      const { nft, marketplace, seller, buyer, owner } = await loadFixture(deployMarketplaceFixture);
      
      // Set royalty to owner (different from seller)
      await nft.setDefaultRoyalty(owner.address, 500); // 5%
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        0,
        ethers.parseEther("1")
      );
      
      const creatorBalanceBefore = await ethers.provider.getBalance(owner.address);
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      
      await marketplace.connect(buyer).purchaseListing(0, { value: ethers.parseEther("1") });
      
      const creatorBalanceAfter = await ethers.provider.getBalance(owner.address);
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      
      // Creator gets 5% royalty
      expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(ethers.parseEther("0.05"));
      
      // Seller gets 1 - 0.025 (fee) - 0.05 (royalty) = 0.925 ETH
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(ethers.parseEther("0.925"));
    });

    it("Should handle NFT without royalty support", async function () {
      const { marketplace, seller, buyer } = await loadFixture(deployMarketplaceFixture);
      
      // Deploy simple ERC721 without royalty
      const SimpleNFT = await ethers.getContractFactory("SimpleERC721");
      const simpleNFT = await SimpleNFT.deploy("Simple", "SMP");
      await simpleNFT.waitForDeployment();
      
      await simpleNFT.mint(seller.address, 1);
      
      await simpleNFT.connect(seller).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(seller).createListing(
        await simpleNFT.getAddress(),
        1,
        ethers.parseEther("1")
      );
      
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      
      await marketplace.connect(buyer).purchaseListing(0, { value: ethers.parseEther("1") });
      
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      
      // Seller gets 1 - 0.025 (fee only, no royalty) = 0.975 ETH
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(ethers.parseEther("0.975"));
    });
  });

  // ============ 5. Cancel Listing Returns NFT ============
  
  describe("5. Cancel Listing Returns NFT", function () {
    
    it("Should return NFT to seller on cancel", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        0,
        ethers.parseEther("1")
      );
      
      await marketplace.connect(seller).cancelListing(0);
      
      expect(await nft.ownerOf(0)).to.equal(seller.address);
    });

    it("Should mark listing as inactive", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        0,
        ethers.parseEther("1")
      );
      
      await marketplace.connect(seller).cancelListing(0);
      
      const listing = await marketplace.getListing(0);
      expect(listing.active).to.be.false;
    });

    it("Should emit ListingCancelled event", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        0,
        ethers.parseEther("1")
      );
      
      await expect(
        marketplace.connect(seller).cancelListing(0)
      ).to.emit(marketplace, "ListingCancelled")
        .withArgs(0);
    });

    it("Should revert if not seller", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        0,
        ethers.parseEther("1")
      );
      
      await expect(
        marketplace.connect(buyer).cancelListing(0)
      ).to.be.revertedWithCustomError(marketplace, "NotSeller");
    });

    it("Should revert if listing not active", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        0,
        ethers.parseEther("1")
      );
      
      await marketplace.connect(seller).cancelListing(0);
      
      await expect(
        marketplace.connect(seller).cancelListing(0)
      ).to.be.revertedWithCustomError(marketplace, "ListingNotActive");
    });
  });

  // ============ 6. Auction Bidding Logic ============
  
  describe("6. Auction Bidding Logic", function () {
    
    it("Should create auction and transfer NFT to escrow", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      
      const duration = 86400; // 1 day
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(),
        0,
        ethers.parseEther("1"),
        duration
      );
      
      expect(await nft.ownerOf(0)).to.equal(await marketplace.getAddress());
    });

    it("Should accept first bid at start price", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(),
        0,
        ethers.parseEther("1"),
        86400
      );
      
      await expect(
        marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1") })
      ).to.emit(marketplace, "BidPlaced")
        .withArgs(0, buyer.address, ethers.parseEther("1"));
      
      const auction = await marketplace.getAuction(0);
      expect(auction.currentBid).to.equal(ethers.parseEther("1"));
      expect(auction.currentBidder).to.equal(buyer.address);
    });

    it("Should require minimum bid increment for subsequent bids", async function () {
      const { nft, marketplace, seller, buyer, buyer2 } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(),
        0,
        ethers.parseEther("1"),
        86400
      );
      
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1") });
      
      // Minimum increment is 5% = 0.05 ETH
      await expect(
        marketplace.connect(buyer2).placeBid(0, { value: ethers.parseEther("1.04") })
      ).to.be.revertedWithCustomError(marketplace, "BidTooLow");
      
      // Should succeed with 5% increment
      await marketplace.connect(buyer2).placeBid(0, { value: ethers.parseEther("1.05") });
      
      const auction = await marketplace.getAuction(0);
      expect(auction.currentBid).to.equal(ethers.parseEther("1.05"));
    });

    it("Should reject bid after auction ended", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(),
        0,
        ethers.parseEther("1"),
        3600 // 1 hour
      );
      
      // Fast forward past auction end
      await time.increase(3601);
      
      await expect(
        marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(marketplace, "AuctionEnded");
    });

    it("Should reject seller bidding on own auction", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(),
        0,
        ethers.parseEther("1"),
        86400
      );
      
      await expect(
        marketplace.connect(seller).placeBid(0, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(marketplace, "SellerCannotBid");
    });
  });

  // ============ 7. Outbid Refund Validation ============
  
  describe("7. Outbid Refund Validation", function () {
    
    it("Should refund previous bidder when outbid", async function () {
      const { nft, marketplace, seller, buyer, buyer2 } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(),
        0,
        ethers.parseEther("1"),
        86400
      );
      
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1") });
      
      const balanceBefore = await ethers.provider.getBalance(buyer.address);
      
      await marketplace.connect(buyer2).placeBid(0, { value: ethers.parseEther("1.05") });
      
      const balanceAfter = await ethers.provider.getBalance(buyer.address);
      
      // buyer should get full refund
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("1"));
    });

    it("Should handle multiple outbids correctly", async function () {
      const { nft, marketplace, seller, buyer, buyer2, owner } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(),
        0,
        ethers.parseEther("1"),
        86400
      );
      
      // Bid 1
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1") });
      const balance1Before = await ethers.provider.getBalance(buyer.address);
      
      // Bid 2 outbids buyer
      await marketplace.connect(buyer2).placeBid(0, { value: ethers.parseEther("1.05") });
      const balance1After = await ethers.provider.getBalance(buyer.address);
      expect(balance1After - balance1Before).to.equal(ethers.parseEther("1"));
      
      const balance2Before = await ethers.provider.getBalance(buyer2.address);
      
      // Bid 3 outbids buyer2
      await marketplace.connect(owner).placeBid(0, { value: ethers.parseEther("1.11") });
      const balance2After = await ethers.provider.getBalance(buyer2.address);
      expect(balance2After - balance2Before).to.equal(ethers.parseEther("1.05"));
    });

    it("Should emit BidRefunded event", async function () {
      const { nft, marketplace, seller, buyer, buyer2 } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(),
        0,
        ethers.parseEther("1"),
        86400
      );
      
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1") });
      
      await expect(
        marketplace.connect(buyer2).placeBid(0, { value: ethers.parseEther("1.05") })
      ).to.emit(marketplace, "BidRefunded")
        .withArgs(0, buyer.address, ethers.parseEther("1"));
    });
  });

  // ============ 8. Auction End Transfer ============
  
  describe("8. Auction End Transfer", function () {
    
    it("Should transfer NFT to highest bidder on finalize", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(),
        0,
        ethers.parseEther("1"),
        3600
      );
      
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1") });
      
      await time.increase(3601);
      
      await marketplace.finalizeAuction(0);
      
      expect(await nft.ownerOf(0)).to.equal(buyer.address);
    });

    it("Should distribute payment correctly on finalize", async function () {
      const { nft, marketplace, seller, buyer, feeRecipient } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(),
        0,
        ethers.parseEther("1"),
        3600
      );
      
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1") });
      
      await time.increase(3601);
      
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      const feeBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);
      
      await marketplace.finalizeAuction(0);
      
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      const feeBalanceAfter = await ethers.provider.getBalance(feeRecipient.address);
      
      // Seller gets 1 - 0.025 (fee) = 0.975 ETH (seller is also creator)
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(ethers.parseEther("0.975"));
      
      // Fee recipient gets 2.5%
      expect(feeBalanceAfter - feeBalanceBefore).to.equal(ethers.parseEther("0.025"));
    });

    it("Should mark auction as inactive", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(),
        0,
        ethers.parseEther("1"),
        3600
      );
      
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1") });
      await time.increase(3601);
      
      await marketplace.finalizeAuction(0);
      
      const auction = await marketplace.getAuction(0);
      expect(auction.active).to.be.false;
    });

    it("Should revert if auction not ended", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(),
        0,
        ethers.parseEther("1"),
        3600
      );
      
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1") });
      
      await expect(
        marketplace.finalizeAuction(0)
      ).to.be.revertedWithCustomError(marketplace, "AuctionNotEnded");
    });

    it("Should return NFT to seller if no bids", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployMarketplaceFixture);
      
      await nft.connect(seller).approve(await marketplace.getAddress(), 0);
      await marketplace.connec});

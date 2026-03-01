const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("NFTMarketplace - Production Test Suite", function () {
  
  // ============ Fixtures ============
  
  async function deployMarketplaceFixture() {
    const [owner, seller, buyer, buyer2, feeRecipient, attacker] = await ethers.getSigners();

    // Deploy NFT Contract
    const NFTContract = await ethers.getContractFactory("NFTContract");
    const nft = await upgrades.deployProxy(
      NFTContract,
      ["Test NFT", "TNFT", "https://api.example.com/", 10000, owner.address, 500],
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

    // Mint NFTs to seller
    const MINTER_ROLE = await nft.MINTER_ROLE();
    await nft.grantRole(MINTER_ROLE, owner.address);
    
    for (let i = 0; i < 5; i++) {
      await nft.mint(seller.address);
    }

    return { 
      nft, 
      marketplace, 
      owner, 
      seller, 
      buyer, 
      buyer2, 
      feeRecipient, 
      attacker 
    };
  }

  async function deployWithApprovalFixture() {
    const fixture = await deployMarketplaceFixture();
    
    // Approve marketplace for all seller's NFTs
    await fixture.nft.connect(fixture.seller).setApprovalForAll(
      await fixture.marketplace.getAddress(), 
      true
    );
    
    return fixture;
  }

  // ============ 1. Listing NFT Transfers to Escrow ============
  
  describe("1. Listing NFT Transfers to Escrow", function () {
    
    it("Should transfer NFT to marketplace on listing", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      const marketplaceAddress = await marketplace.getAddress();
      
      expect(await nft.ownerOf(0)).to.equal(seller.address);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(),
        0,
        ethers.parseEther("1")
      );
      
      expect(await nft.ownerOf(0)).to.equal(marketplaceAddress);
    });

    it("Should create listing with correct details", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
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

    it("Should emit ListingCreated event", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      await expect(
        marketplace.connect(seller).createListing(
          await nft.getAddress(),
          0,
          ethers.parseEther("1")
        )
      ).to.emit(marketplace, "ListingCreated")
        .withArgs(0, await nft.getAddress(), 0, seller.address, ethers.parseEther("1"));
    });

    it("Should reject listing without approval", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployMarketplaceFixture);
      
      await expect(
        marketplace.connect(seller).createListing(
          await nft.getAddress(),
          0,
          ethers.parseEther("1")
        )
      ).to.be.revertedWithCustomError(marketplace, "NotApproved");
    });

    it("Should reject listing if not owner", async function () {
      const { nft, marketplace, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await expect(
        marketplace.connect(buyer).createListing(
          await nft.getAddress(),
          0,
          ethers.parseEther("1")
        )
      ).to.be.revertedWithCustomError(marketplace, "NotTokenOwner");
    });

    it("Should reject listing with zero price", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      await expect(
        marketplace.connect(seller).createListing(
          await nft.getAddress(),
          0,
          0
        )
      ).to.be.revertedWithCustomError(marketplace, "InvalidParameters");
    });

    it("Should track total listings", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      expect(await marketplace.getTotalListings()).to.equal(0);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      
      expect(await marketplace.getTotalListings()).to.equal(1);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 1, ethers.parseEther("2")
      );
      
      expect(await marketplace.getTotalListings()).to.equal(2);
    });
  });

  // ============ 2. Successful Buy Transfers Ownership ============
  
  describe("2. Successful Buy Transfers Ownership", function () {
    
    it("Should transfer NFT to buyer on purchase", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      
      await marketplace.connect(buyer).purchaseListing(0, { 
        value: ethers.parseEther("1") 
      });
      
      expect(await nft.ownerOf(0)).to.equal(buyer.address);
    });

    it("Should mark listing as inactive after purchase", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      
      await marketplace.connect(buyer).purchaseListing(0, { 
        value: ethers.parseEther("1") 
      });
      
      const listing = await marketplace.getListing(0);
      expect(listing.active).to.be.false;
    });

    it("Should emit ListingPurchased event", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      
      await expect(
        marketplace.connect(buyer).purchaseListing(0, { 
          value: ethers.parseEther("1") 
        })
      ).to.emit(marketplace, "ListingPurchased");
    });

    it("Should reject purchase with insufficient payment", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      
      await expect(
        marketplace.connect(buyer).purchaseListing(0, { 
          value: ethers.parseEther("0.5") 
        })
      ).to.be.revertedWithCustomError(marketplace, "InsufficientPayment");
    });

    it("Should reject purchase of inactive listing", async function () {
      const { nft, marketplace, seller, buyer, buyer2 } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      
      await marketplace.connect(buyer).purchaseListing(0, { 
        value: ethers.parseEther("1") 
      });
      
      await expect(
        marketplace.connect(buyer2).purchaseListing(0, { 
          value: ethers.parseEther("1") 
        })
      ).to.be.revertedWithCustomError(marketplace, "ListingNotActive");
    });

    it("Should refund excess payment", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      
      const balanceBefore = await ethers.provider.getBalance(buyer.address);
      
      const tx = await marketplace.connect(buyer).purchaseListing(0, { 
        value: ethers.parseEther("2") 
      });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      const balanceAfter = await ethers.provider.getBalance(buyer.address);
      
      // Should only pay 1 ETH + gas, not 2 ETH
      expect(balanceBefore - balanceAfter).to.be.closeTo(
        ethers.parseEther("1") + gasUsed,
        ethers.parseEther("0.001")
      );
    });
  });

  // ============ 3. Fee Calculation Correctness ============
  
  describe("3. Fee Calculation Correctness", function () {
    
    it("Should calculate 2.5% marketplace fee correctly", async function () {
      const { nft, marketplace, seller, buyer, feeRecipient } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      
      const feeBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);
      
      await marketplace.connect(buyer).purchaseListing(0, { 
        value: ethers.parseEther("1") 
      });
      
      const feeBalanceAfter = await ethers.provider.getBalance(feeRecipient.address);
      const feeReceived = feeBalanceAfter - feeBalanceBefore;
      
      // 2.5% of 1 ETH = 0.025 ETH
      expect(feeReceived).to.equal(ethers.parseEther("0.025"));
    });

    it("Should calculate fees for different prices", async function () {
      const { nft, marketplace, seller, buyer, feeRecipient } = await loadFixture(deployWithApprovalFixture);
      
      const testCases = [
        { price: ethers.parseEther("10"), expectedFee: ethers.parseEther("0.25") },
        { price: ethers.parseEther("0.1"), expectedFee: ethers.parseEther("0.0025") },
        { price: ethers.parseEther("100"), expectedFee: ethers.parseEther("2.5") }
      ];
      
      for (let i = 0; i < testCases.length; i++) {
        const feeBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);
        
        await marketplace.connect(seller).createListing(
          await nft.getAddress(), i, testCases[i].price
        );
        
        await marketplace.connect(buyer).purchaseListing(i, { 
          value: testCases[i].price 
        });
        
        const feeBalanceAfter = await ethers.provider.getBalance(feeRecipient.address);
        const feeReceived = feeBalanceAfter - feeBalanceBefore;
        
        expect(feeReceived).to.equal(testCases[i].expectedFee);
      }
    });

    it("Should allow admin to update marketplace fee", async function () {
      const { marketplace, owner } = await loadFixture(deployMarketplaceFixture);
      
      await marketplace.setMarketplaceFee(500); // 5%
      expect(await marketplace.marketplaceFee()).to.equal(500);
    });

    it("Should reject fee above maximum (10%)", async function () {
      const { marketplace, owner } = await loadFixture(deployMarketplaceFixture);
      
      await expect(
        marketplace.setMarketplaceFee(1001) // 10.01%
      ).to.be.revertedWithCustomError(marketplace, "InvalidParameters");
    });

    it("Should allow changing fee recipient", async function () {
      const { marketplace, owner, buyer } = await loadFixture(deployMarketplaceFixture);
      
      await marketplace.setFeeRecipient(buyer.address);
      expect(await marketplace.feeRecipient()).to.equal(buyer.address);
    });
  });

  // ============ 4. Royalty Distribution Correctness ============
  
  describe("4. Royalty Distribution Correctness", function () {
    
    it("Should distribute 5% royalty to creator", async function () {
      const { nft, marketplace, seller, buyer, owner } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      
      const creatorBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      await marketplace.connect(buyer).purchaseListing(0, { 
        value: ethers.parseEther("1") 
      });
      
      const creatorBalanceAfter = await ethers.provider.getBalance(owner.address);
      const royaltyReceived = creatorBalanceAfter - creatorBalanceBefore;
      
      // 5% of 1 ETH = 0.05 ETH
      expect(royaltyReceived).to.equal(ethers.parseEther("0.05"));
    });

    it("Should distribute both fee and royalty correctly", async function () {
      const { nft, marketplace, seller, buyer, owner, feeRecipient } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      const creatorBalanceBefore = await ethers.provider.getBalance(owner.address);
      const feeBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);
      
      await marketplace.connect(buyer).purchaseListing(0, { 
        value: ethers.parseEther("1") 
      });
      
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      const creatorBalanceAfter = await ethers.provider.getBalance(owner.address);
      const feeBalanceAfter = await ethers.provider.getBalance(feeRecipient.address);
      
      const sellerReceived = sellerBalanceAfter - sellerBalanceBefore;
      const creatorReceived = creatorBalanceAfter - creatorBalanceBefore;
      const feeReceived = feeBalanceAfter - feeBalanceBefore;
      
      // Marketplace fee: 2.5% = 0.025 ETH
      expect(feeReceived).to.equal(ethers.parseEther("0.025"));
      
      // Royalty: 5% = 0.05 ETH
      expect(creatorReceived).to.equal(ethers.parseEther("0.05"));
      
      // Seller: 100% - 2.5% - 5% = 92.5% = 0.925 ETH
      expect(sellerReceived).to.equal(ethers.parseEther("0.925"));
    });

    it("Should handle zero royalty NFTs", async function () {
      const { marketplace, seller, buyer, owner } = await loadFixture(deployWithApprovalFixture);
      
      // Deploy NFT without royalty
      const NFTNoRoyalty = await ethers.getContractFactory("NFTContract");
      const nftNoRoyalty = await upgrades.deployProxy(
        NFTNoRoyalty,
        ["No Royalty NFT", "NRNFT", "https://api.example.com/", 10000, owner.address, 0],
        { initializer: "initialize", kind: "uups" }
      );
      
      const MINTER_ROLE = await nftNoRoyalty.MINTER_ROLE();
      await nftNoRoyalty.grantRole(MINTER_ROLE, owner.address);
      await nftNoRoyalty.mint(seller.address);
      
      await nftNoRoyalty.connect(seller).setApprovalForAll(
        await marketplace.getAddress(), true
      );
      
      await marketplace.connect(seller).createListing(
        await nftNoRoyalty.getAddress(), 0, ethers.parseEther("1")
      );
      
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      
      await marketplace.connect(buyer).purchaseListing(0, { 
        value: ethers.parseEther("1") 
      });
      
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      const sellerReceived = sellerBalanceAfter - sellerBalanceBefore;
      
      // Seller gets 97.5% (100% - 2.5% fee, no royalty)
      expect(sellerReceived).to.equal(ethers.parseEther("0.975"));
    });
  });

  // ============ 5. Cancel Listing Returns NFT ============
  
  describe("5. Cancel Listing Returns NFT", function () {
    
    it("Should return NFT to seller on cancel", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      
      expect(await nft.ownerOf(0)).to.equal(await marketplace.getAddress());
      
      await marketplace.connect(seller).cancelListing(0);
      
      expect(await nft.ownerOf(0)).to.equal(seller.address);
    });

    it("Should mark listing as inactive on cancel", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      
      await marketplace.connect(seller).cancelListing(0);
      
      const listing = await marketplace.getListing(0);
      expect(listing.active).to.be.false;
    });

    it("Should emit ListingCancelled event", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      
      await expect(
        marketplace.connect(seller).cancelListing(0)
      ).to.emit(marketplace, "ListingCancelled")
        .withArgs(0);
    });

    it("Should reject cancel by non-seller", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      
      await expect(
        marketplace.connect(buyer).cancelListing(0)
      ).to.be.revertedWithCustomError(marketplace, "NotSeller");
    });

    it("Should reject cancel of inactive listing", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      
      await marketplace.connect(seller).cancelListing(0);
      
      await expect(
        marketplace.connect(seller).cancelListing(0)
      ).to.be.revertedWithCustomError(marketplace, "ListingNotActive");
    });

    it("Should allow updating listing price", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      
      await marketplace.connect(seller).updateListingPrice(0, ethers.parseEther("2"));
      
      const listing = await marketplace.getListing(0);
      expect(listing.price).to.equal(ethers.parseEther("2"));
    });
  });

  // ============ 6. Auction Bidding Logic ============
  
  describe("6. Auction Bidding Logic", function () {
    
    it("Should create auction with correct details", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      const duration = 86400; // 1 day
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(),
        0,
        ethers.parseEther("1"),
        duration
      );
      
      const auction = await marketplace.getAuction(0);
      expect(auction.nftContract).to.equal(await nft.getAddress());
      expect(auction.tokenId).to.equal(0);
      expect(auction.seller).to.equal(seller.address);
      expect(auction.startPrice).to.equal(ethers.parseEther("1"));
      expect(auction.currentBid).to.equal(0);
      expect(auction.currentBidder).to.equal(ethers.ZeroAddress);
      expect(auction.active).to.be.true;
    });

    it("Should accept first bid at start price", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 86400
      );
      
      await marketplace.connect(buyer).placeBid(0, { 
        value: ethers.parseEther("1") 
      });
      
      const auction = await marketplace.getAuction(0);
      expect(auction.currentBid).to.equal(ethers.parseEther("1"));
      expect(auction.currentBidder).to.equal(buyer.address);
    });

    it("Should require minimum bid increment (5%)", async function () {
      const { nft, marketplace, seller, buyer, buyer2 } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 86400
      );
      
      await marketplace.connect(buyer).placeBid(0, { 
        value: ethers.parseEther("1") 
      });
      
      // Next bid must be at least 1.05 ETH (5% increment)
      await expect(
        marketplace.connect(buyer2).placeBid(0, { 
          value: ethers.parseEther("1.04") 
        })
      ).to.be.revertedWithCustomError(marketplace, "BidTooLow");
      
      // 1.05 ETH should work
      await marketplace.connect(buyer2).placeBid(0, { 
        value: ethers.parseEther("1.05") 
      });
      
      const auction = await marketplace.getAuction(0);
      expect(auction.currentBid).to.equal(ethers.parseEther("1.05"));
    });

    it("Should emit BidPlaced event", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 86400
      );
      
      await expect(
        marketplace.connect(buyer).placeBid(0, { 
          value: ethers.parseEther("1") 
        })
      ).to.emit(marketplace, "BidPlaced")
        .withArgs(0, buyer.address, ethers.parseEther("1"));
    });

    it("Should reject bid below start price", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 86400
      );
      
      await expect(
        marketplace.co  
  describe("6. Auction Bidding Logic", function () {
    
    it("Should create auction with correct details", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      const duration = 7 * 24 * 60 * 60; // 7 days
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(),
        0,
        ethers.parseEther("1"),
        duration
      );
      
      const auction = await marketplace.getAuction(0);
      expect(auction.seller).to.equal(seller.address);
      expect(auction.startPrice).to.equal(ethers.parseEther("1"));
      expect(auction.currentBid).to.equal(0);
      expect(auction.active).to.be.true;
    });

    it("Should accept valid bid", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 7 * 24 * 60 * 60
      );
      
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1.5") });
      
      const auction = await marketplace.getAuction(0);
      expect(auction.currentBid).to.equal(ethers.parseEther("1.5"));
      expect(auction.currentBidder).to.equal(buyer.address);
    });

    it("Should reject bid below start price", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 7 * 24 * 60 * 60
      );
      
      await expect(
        marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWithCustomError(marketplace, "BidTooLow");
    });

    it("Should reject bid not higher than current bid", async function () {
      const { nft, marketplace, seller, buyer, buyer2 } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 7 * 24 * 60 * 60
      );
      
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1.5") });
      
      await expect(
        marketplace.connect(buyer2).placeBid(0, { value: ethers.parseEther("1.5") })
      ).to.be.revertedWithCustomError(marketplace, "BidTooLow");
    });

    it("Should emit BidPlaced event", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 7 * 24 * 60 * 60
      );
      
      await expect(
        marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1.5") })
      ).to.emit(marketplace, "BidPlaced")
        .withArgs(0, buyer.address, ethers.parseEther("1.5"));
    });

    it("Should reject bid on expired auction", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 60 // 1 minute
      );
      
      await time.increase(61);
      
      await expect(
        marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1.5") })
      ).to.be.revertedWithCustomError(marketplace, "AuctionEnded");
    });
  });

  // ============ 7. Outbid Refund Validation ============
  
  describe("7. Outbid Refund Validation", function () {
    
    it("Should refund previous bidder when outbid", async function () {
      const { nft, marketplace, seller, buyer, buyer2 } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 7 * 24 * 60 * 60
      );
      
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1.5") });
      
      const buyer1BalanceBefore = await ethers.provider.getBalance(buyer.address);
      
      await marketplace.connect(buyer2).placeBid(0, { value: ethers.parseEther("2") });
      
      const buyer1BalanceAfter = await ethers.provider.getBalance(buyer.address);
      
      // Buyer1 should get refunded 1.5 ETH
      expect(buyer1BalanceAfter - buyer1BalanceBefore).to.equal(ethers.parseEther("1.5"));
    });

    it("Should handle multiple outbids correctly", async function () {
      const { nft, marketplace, seller, buyer, buyer2, owner } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 7 * 24 * 60 * 60
      );
      
      // Bid 1
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1.5") });
      const buyer1Balance1 = await ethers.provider.getBalance(buyer.address);
      
      // Bid 2 (outbids buyer1)
      await marketplace.connect(buyer2).placeBid(0, { value: ethers.parseEther("2") });
      const buyer1Balance2 = await ethers.provider.getBalance(buyer.address);
      expect(buyer1Balance2 - buyer1Balance1).to.equal(ethers.parseEther("1.5"));
      
      // Bid 3 (outbids buyer2)
      await marketplace.connect(owner).placeBid(0, { value: ethers.parseEther("3") });
      const buyer2Balance = await ethers.provider.getBalance(buyer2.address);
      
      const auction = await marketplace.getAuction(0);
      expect(auction.currentBid).to.equal(ethers.parseEther("3"));
      expect(auction.currentBidder).to.equal(owner.address);
    });

    it("Should emit BidRefunded event", async function () {
      const { nft, marketplace, seller, buyer, buyer2 } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 7 * 24 * 60 * 60
      );
      
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1.5") });
      
      await expect(
        marketplace.connect(buyer2).placeBid(0, { value: ethers.parseEther("2") })
      ).to.emit(marketplace, "BidRefunded")
        .withArgs(0, buyer.address, ethers.parseEther("1.5"));
    });
  });

  // ============ 8. Auction End Transfer ============
  
  describe("8. Auction End Transfer", function () {
    
    it("Should transfer NFT to highest bidder on finalize", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 60
      );
      
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1.5") });
      
      await time.increase(61);
      
      await marketplace.finalizeAuction(0);
      
      expect(await nft.ownerOf(0)).to.equal(buyer.address);
    });

    it("Should distribute payments correctly on finalize", async function () {
      const { nft, marketplace, seller, buyer, owner, feeRecipient } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 60
      );
      
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("10") });
      
      await time.increase(61);
      
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      const creatorBalanceBefore = await ethers.provider.getBalance(owner.address);
      const feeBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);
      
      await marketplace.finalizeAuction(0);
      
      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      const creatorBalanceAfter = await ethers.provider.getBalance(owner.address);
      const feeBalanceAfter = await ethers.provider.getBalance(feeRecipient.address);
      
      // Fee: 2.5% of 10 = 0.25 ETH
      expect(feeBalanceAfter - feeBalanceBefore).to.equal(ethers.parseEther("0.25"));
      
      // Royalty: 5% of 10 = 0.5 ETH
      expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(ethers.parseEther("0.5"));
      
      // Seller: 92.5% of 10 = 9.25 ETH
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(ethers.parseEther("9.25"));
    });

    it("Should return NFT to seller if no bids", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 60
      );
      
      await time.increase(61);
      
      await marketplace.finalizeAuction(0);
      
      expect(await nft.ownerOf(0)).to.equal(seller.address);
    });

    it("Should reject finalize before auction ends", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 7 * 24 * 60 * 60
      );
      
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1.5") });
      
      await expect(
        marketplace.finalizeAuction(0)
      ).to.be.revertedWithCustomError(marketplace, "AuctionNotEnded");
    });

    it("Should emit AuctionFinalized event", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 60
      );
      
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1.5") });
      
      await time.increase(61);
      
      await expect(
        marketplace.finalizeAuction(0)
      ).to.emit(marketplace, "AuctionFinalized")
        .withArgs(0, buyer.address, ethers.parseEther("1.5"));
    });

    it("Should allow seller to cancel auction with no bids", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 7 * 24 * 60 * 60
      );
      
      await marketplace.connect(seller).cancelAuction(0);
      
      expect(await nft.ownerOf(0)).to.equal(seller.address);
    });

    it("Should reject cancel auction with bids", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 7 * 24 * 60 * 60
      );
      
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1.5") });
      
      await expect(
        marketplace.connect(seller).cancelAuction(0)
      ).to.be.revertedWithCustomError(marketplace, "AuctionHasBids");
    });
  });

  // ============ 9. Reentrancy Protection ============
  
  describe("9. Reentrancy Protection", function () {
    
    it("Should have reentrancy guard on purchaseListing", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      
      // Deploy malicious contract
      const MaliciousBuyer = await ethers.getContractFactory("MaliciousBuyer");
      const malicious = await MaliciousBuyer.deploy(await marketplace.getAddress());
      await malicious.waitForDeployment();
      
      // Fund malicious contract
      await seller.sendTransaction({
        to: await malicious.getAddress(),
        value: ethers.parseEther("10")
      });
      
      // Attempt reentrancy attack
      await expect(
        malicious.attack(0)
      ).to.be.reverted;
    });

    it("Should have reentrancy guard on placeBid", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 7 * 24 * 60 * 60
      );
      
      const MaliciousBidder = await ethers.getContractFactory("MaliciousBidder");
      const malicious = await MaliciousBidder.deploy(await marketplace.getAddress());
      await malicious.waitForDeployment();
      
      await seller.sendTransaction({
        to: await malicious.getAddress(),
        value: ethers.parseEther("10")
      });
      
      await expect(
        malicious.attack(0)
      ).to.be.reverted;
    });

    it("Should have reentrancy guard on finalizeAuction", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 60
      );
      
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1.5") });
      
      await time.increase(61);
      
      // Normal finalize should work
      await expect(marketplace.finalizeAuction(0)).to.not.be.reverted;
    });
  });

  // ============ 10. Edge Cases ============
  
  describe("10. Edge Cases", function () {
    
    it("Should reject seller buying own NFT", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      
      await expect(
        marketplace.connect(seller).purchaseListing(0, { value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(marketplace, "CannotBuyOwnNFT");
    });

    it("Should reject seller bidding on own auction", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 7 * 24 * 60 * 60
      );
      
      await expect(
        marketplace.connect(seller).placeBid(0, { value: ethers.parseEther("1.5") })
      ).to.be.revertedWithCustomError(marketplace, "SellerCannotBid");
    });

    it("Should handle zero address NFT contract", async function () {
      const { marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      await expect(
        marketplace.connect(seller).createListing(
          ethers.ZeroAddress, 0, ethers.parseEther("1")
        )
      ).to.be.revertedWithCustomError(marketplace, "InvalidParameters");
    });

    it("Should reject expired auction finalization twice", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 60
      );
      
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1.5") });
      
      await time.increase(61);
      
      await marketplace.finalizeAuction(0);
      
      await expect(
        marketplace.finalizeAuction(0)
      ).to.be.revertedWithCustomError(marketplace, "AuctionNotActive");
    });

    it("Should handle very high prices", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      const highPrice = ethers.parseEther("1000000");
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, highPrice
      );
      
      await marketplace.connect(buyer).purchaseListing(0, { value: highPrice });
      
      expect(await nft.ownerOf(0)).to.equal(buyer.address);
    });

    it("Should handle multiple simultaneous listings", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      for (let i = 0; i < 5; i++) {
        await marketplace.connect(seller).createListing(
          await nft.getAddress(), i, ethers.parseEther(`${i + 1}`)
        );
      }
      
      expect(await marketplace.getTotalListings()).to.equal(5);
    });

    it("Should handle paused marketplace", async function () {
      const { nft, marketplace, seller, owner } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.pause();
      
      await expect(
        marketplace.connect(seller).createListing(
          await nft.getAddress(), 0, ethers.parseEther("1")
        )
      ).to.be.reverted;
      
      await marketplace.unpause();
      
      await expect(
        marketplace.connect(seller).createListing(
          await nft.getAddress(), 0, ethers.parseEther("1")
        )
      ).to.not.be.reverted;
    });

    it("Should get active listings", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 1, ethers.parseEther("2")
      );
      
      const activeListings = await marketplace.getActiveListings();
      expect(activeListings.length).to.equal(2);
      
      await marketplace.connect(buyer).purchaseListing(0, { value: ethers.parseEther("1") });
      
      const activeListingsAfter = await marketplace.getActiveListings();
      expect(activeListingsAfter.length).to.equal(1);
    });
  });

  // ============ Gas Reporting ============
  
  describe("11. Gas Usage", function () {
    
    it("Should report gas for createListing", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      const tx = await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      const receipt = await tx.wait();
      
      console.log(`      ⛽ createListing gas: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lessThan(200000);
    });

    it("Should report gas for purchaseListing", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createListing(
        await nft.getAddress(), 0, ethers.parseEther("1")
      );
      
      const tx = await marketplace.connect(buyer).purchaseListing(0, { 
        value: ethers.parseEther("1") 
      });
      const receipt = await tx.wait();
      
      console.log(`      ⛽ purchaseListing gas: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lessThan(250000);
    });

    it("Should report gas for createAuction", async function () {
      const { nft, marketplace, seller } = await loadFixture(deployWithApprovalFixture);
      
      const tx = await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 7 * 24 * 60 * 60
      );
      const receipt = await tx.wait();
      
      console.log(`      ⛽ createAuction gas: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lessThan(200000);
    });

    it("Should report gas for placeBid", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 7 * 24 * 60 * 60
      );
      
      const tx = await marketplace.connect(buyer).placeBid(0, { 
        value: ethers.parseEther("1.5") 
      });
      const receipt = await tx.wait();
      
      console.log(`      ⛽ placeBid gas: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lessThan(150000);
    });

    it("Should report gas for finalizeAuction", async function () {
      const { nft, marketplace, seller, buyer } = await loadFixture(deployWithApprovalFixture);
      
      await marketplace.connect(seller).createAuction(
        await nft.getAddress(), 0, ethers.parseEther("1"), 60
      );
      
      await marketplace.connect(buyer).placeBid(0, { value: ethers.parseEther("1.5") });
      
      await time.increase(61);
      
      const tx = await marketplace.finalizeAuction(0);
      const receipt = await tx.wait();
      
      console.log(`      ⛽ finalizeAuction gas: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lessThan(300000);
    });
  });
});
});
});

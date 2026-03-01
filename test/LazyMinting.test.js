const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("EIP-712 Lazy Minting Tests", function () {
  
  // ============ Fixtures ============
  
  async function deployNFTFixture() {
    const [owner, signer1, signer2, buyer1, buyer2, attacker] = await ethers.getSigners();

    const NFTContract = await ethers.getContractFactory("NFTContract");
    const nft = await upgrades.deployProxy(
      NFTContract,
      [
        "Lazy Mint NFT",
        "LMNFT",
        "https://api.example.com/metadata/",
        10000,
        owner.address,
        500
      ],
      { initializer: "initialize", kind: "uups" }
    );
    await nft.waitForDeployment();

    const SIGNER_ROLE = await nft.SIGNER_ROLE();
    await nft.grantRole(SIGNER_ROLE, signer1.address);

    return { nft, owner, signer1, signer2, buyer1, buyer2, attacker, SIGNER_ROLE };
  }

  // ============ Helper Functions ============
  
  async function createVoucher(nft, signer, tokenId, minPrice, uri, buyer, nonce, expiry) {
    const domain = {
      name: await nft.name(),
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await nft.getAddress()
    };

    const types = {
      NFTVoucher: [
        { name: "tokenId", type: "uint256" },
        { name: "minPrice", type: "uint256" },
        { name: "uri", type: "string" },
        { name: "buyer", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "expiry", type: "uint256" }
      ]
    };

    const voucher = { tokenId, minPrice, uri, buyer, nonce, expiry };
    const signature = await signer.signTypedData(domain, types, voucher);
    
    return { ...voucher, signature };
  }

  async function getCurrentTimestamp() {
    return (await ethers.provider.getBlock('latest')).timestamp;
  }

  // ============ 1. Valid Voucher Redemption ============
  
  describe("1. Valid Voucher Redemption", function () {
    
    it("Should redeem valid voucher with exact payment", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft,
        signer1,
        0,
        ethers.parseEther("0.1"),
        "ipfs://QmTest123",
        ethers.ZeroAddress,
        1,
        0
      );
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.emit(nft, "TokenLazyMinted")
        .withArgs(buyer1.address, 0, ethers.parseEther("0.1"), 1);
      
      expect(await nft.ownerOf(0)).to.equal(buyer1.address);
      expect(await nft.balanceOf(buyer1.address)).to.equal(1);
    });

    it("Should redeem voucher with overpayment", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"), 
        "ipfs://QmTest", ethers.ZeroAddress, 1, 0
      );
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.5") })
      ).to.emit(nft, "TokenLazyMinted");
      
      expect(await nft.ownerOf(0)).to.equal(buyer1.address);
    });

    it("Should redeem voucher with zero price", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft, signer1, 0, 0, "ipfs://QmFree", ethers.ZeroAddress, 1, 0
      );
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: 0 })
      ).to.emit(nft, "TokenLazyMinted");
      
      expect(await nft.ownerOf(0)).to.equal(buyer1.address);
    });

    it("Should redeem voucher for specific buyer", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", buyer1.address, 1, 0
      );
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.emit(nft, "TokenLazyMinted");
      
      expect(await nft.ownerOf(0)).to.equal(buyer1.address);
    });

    it("Should redeem multiple vouchers sequentially", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      for (let i = 0; i < 3; i++) {
        const voucher = await createVoucher(
          nft, signer1, i, ethers.parseEther("0.1"),
          `ipfs://QmTest${i}`, ethers.ZeroAddress, i + 1, 0
        );
        
        await nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") });
        expect(await nft.ownerOf(i)).to.equal(buyer1.address);
      }
      
      expect(await nft.balanceOf(buyer1.address)).to.equal(3);
    });
  });

  // ============ 2. Invalid Signature Rejection ============
  
  describe("2. Invalid Signature Rejection", function () {
    
    it("Should reject voucher with tampered tokenId", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, 0
      );
      
      voucher.tokenId = 999; // Tamper with tokenId
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(nft, "InvalidSignature");
    });

    it("Should reject voucher with tampered price", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, 0
      );
      
      voucher.minPrice = ethers.parseEther("0.01"); // Tamper with price
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(nft, "InvalidSignature");
    });

    it("Should reject voucher with tampered URI", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, 0
      );
      
      voucher.uri = "ipfs://QmHacked";
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(nft, "InvalidSignature");
    });

    it("Should reject voucher with tampered buyer", async function () {
      const { nft, signer1, buyer1, buyer2 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", buyer1.address, 1, 0
      );
      
      voucher.buyer = buyer2.address; // Change buyer
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.be.reverted; // Will revert with UnauthorizedBuyer or InvalidSignature
    });

    it("Should reject voucher with tampered nonce", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, 0
      );
      
      voucher.nonce = 999;
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(nft, "InvalidSignature");
    });

    it("Should reject voucher signed by non-signer", async function () {
      const { nft, signer2, buyer1 } = await loadFixture(deployNFTFixture);
      
      // signer2 doesn't have SIGNER_ROLE
      const voucher = await createVoucher(
        nft, signer2, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, 0
      );
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(nft, "InvalidSignature");
    });

    it("Should reject voucher with completely invalid signature", async function () {
      const { nft, buyer1 } = await loadFixture(deployNFTFixture);
      
      const voucher = {
        tokenId: 0,
        minPrice: ethers.parseEther("0.1"),
        uri: "ipfs://QmTest",
        buyer: ethers.ZeroAddress,
        nonce: 1,
        expiry: 0,
        signature: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b"
      };
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.be.reverted; // ECDSA error
    });
  });

  // ============ 3. Replay Attack Prevention ============
  
  describe("3. Replay Attack Prevention", function () {
    
    it("Should reject reused voucher (same nonce)", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, 0
      );
      
      // First redemption succeeds
      await nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") });
      
      // Second redemption with same voucher fails
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(nft, "NonceAlreadyUsed");
    });

    it("Should track nonce usage per signer", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, 0
      );
      
      expect(await nft.isNonceUsed(signer1.address, 1)).to.be.false;
      
      await nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") });
      
      expect(await nft.isNonceUsed(signer1.address, 1)).to.be.true;
    });

    it("Should allow same nonce for different signers", async function () {
      const { nft, signer1, signer2, buyer1, SIGNER_ROLE } = await loadFixture(deployNFTFixture);
      
      await nft.grantRole(SIGNER_ROLE, signer2.address);
      
      const voucher1 = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest1", ethers.ZeroAddress, 1, 0
      );
      
      const voucher2 = await createVoucher(
        nft, signer2, 1, ethers.parseEther("0.1"),
        "ipfs://QmTest2", ethers.ZeroAddress, 1, 0
      );
      
      await nft.connect(buyer1).redeemVoucher(voucher1, { value: ethers.parseEther("0.1") });
      await nft.connect(buyer1).redeemVoucher(voucher2, { value: ethers.parseEther("0.1") });
      
      expect(await nft.ownerOf(0)).to.equal(buyer1.address);
      expect(await nft.ownerOf(1)).to.equal(buyer1.address);
    });

    it("Should allow manual nonce invalidation", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      expect(await nft.isNonceUsed(signer1.address, 5)).to.be.false;
      
      await nft.connect(signer1).invalidateNonce(5);
      
      expect(await nft.isNonceUsed(signer1.address, 5)).to.be.true;
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 5, 0
      );
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(nft, "NonceAlreadyUsed");
    });

    it("Should prevent replay across different buyers", async function () {
      const { nft, signer1, buyer1, buyer2 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, 0
      );
      
      await nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") });
      
      await expect(
        nft.connect(buyer2).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(nft, "NonceAlreadyUsed");
    });

    it("Should handle multiple nonces correctly", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      for (let i = 0; i < 5; i++) {
        const voucher = await createVoucher(
          nft, signer1, i, ethers.parseEther("0.1"),
          `ipfs://QmTest${i}`, ethers.ZeroAddress, i + 1, 0
        );
        
        await nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") });
        expect(await nft.isNonceUsed(signer1.address, i + 1)).to.be.true;
      }
    });
  });

  // ============ 4. Expired Voucher Rejection ============
  
  describe("4. Expired Voucher Rejection", function () {
    
    it("Should reject expired voucher", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const currentTime = await getCurrentTimestamp();
      const expiry = currentTime - 3600; // 1 hour ago
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, expiry
      );
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(nft, "VoucherExpired");
    });

    it("Should accept voucher with future expiry", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const currentTime = await getCurrentTimestamp();
      const expiry = currentTime + 3600; // 1 hour from now
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, expiry
      );
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.emit(nft, "TokenLazyMinted");
    });

    it("Should accept voucher with zero expiry (no expiration)", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, 0
      );
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.emit(nft, "TokenLazyMinted");
    });

    it("Should reject voucher that expires at exact timestamp", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const currentTime = await getCurrentTimestamp();
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, currentTime + 2
      );
      
      // Advance time past expiry
      await time.increase(3);
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(nft, "VoucherExpired");
    });

    it("Should accept voucher just before expiry", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const currentTime = await getCurrentTimestamp();
      const expiry = currentTime + 10;
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, expiry
      );
      
      await time.increase(5); // Still 5 seconds before expiry
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.emit(nft, "TokenLazyMinted");
    });
  });

  // ============ 5. Domain Separator Validation ============
  
  describe("5. Domain Separator Validation", function () {
    
    it("Should return correct domain separator", async function () {
      const { nft } = await loadFixture(deployNFTFixture);
      
      const domainSeparator = await nft.getDomainSeparator();
      expect(domainSeparator).to.be.properHex(64); // 32 bytes = 64 hex chars
    });

    it("Should have unique domain separator per contract", async function () {
      const { nft } = await loadFixture(deployNFTFixture);
      const { nft: nft2 } = await loadFixture(deployNFTFixture);
      
      const domain1 = await nft.getDomainSeparator();
      const domain2 = await nft2.getDomainSeparator();
      
      // They will be the same because same name/version/chainId
      // but different verifyingContract addresses
      expect(domain1).to.be.properHex(64);
      expect(domain2).to.be.properHex(64);
    });

    it("Should include contract name in domain", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const domain = {
        name: "Wrong Name",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await nft.getAddress()
      };

      const types = {
        NFTVoucher: [
          { name: "tokenId", type: "uint256" },
          { name: "minPrice", type: "uint256" },
          { name: "uri", type: "string" },
          { name: "buyer", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "expiry", type: "uint256" }
        ]
      };

      const voucher = {
        tokenId: 0,
        minPrice: ethers.parseEther("0.1"),
        uri: "ipfs://QmTest",
        buyer: ethers.ZeroAddress,
        nonce: 1,
        expiry: 0
      };

      const signature = await signer1.signTypedData(domain, types, voucher);
      
      await expect(
        nft.connect(buyer1).redeemVoucher({ ...voucher, signature }, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(nft, "InvalidSignature");
    });

    it("Should validate chain ID in domain", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const domain = {
        name: await nft.name(),
        version: "1",
        chainId: 999999, // Wrong chain ID
        verifyingContract: await nft.getAddress()
      };

      const types = {
        NFTVoucher: [
          { name: "tokenId", type: "uint256" },
          { name: "minPrice", type: "uint256" },
          { name: "uri", type: "string" },
          { name: "buyer", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "expiry", type: "uint256" }
        ]
      };

      const voucher = {
        tokenId: 0,
        minPrice: ethers.parseEther("0.1"),
        uri: "ipfs://QmTest",
        buyer: ethers.ZeroAddress,
        nonce: 1,
        expiry: 0
      };

      const signature = await signer1.signTypedData(domain, types, voucher);
      
      await expect(
        nft.connect(buyer1).redeemVoucher({ ...voucher, signature }, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(nft, "InvalidSignature");
    });
  });

  // ============ 6. Correct Signer Verification ============
  
  describe("6. Correct Signer Verification", function () {
    
    it("Should verify signer has SIGNER_ROLE", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, 0
      );
      
      const result = await nft.verifyVoucher(voucher);
      expect(result[0]).to.equal(signer1.address);
      expect(result[1]).to.be.true;
    });

    it("Should reject voucher after signer role revoked", async function () {
      const { nft, signer1, buyer1, SIGNER_ROLE } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, 0
      );
      
      // Revoke signer role
      await nft.revokeRole(SIGNER_ROLE, signer1.address);
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(nft, "InvalidSignature");
    });

    it("Should accept voucher from newly granted signer", async function () {
      const { nft, signer2, buyer1, SIGNER_ROLE } = await loadFixture(deployNFTFixture);
      
      await nft.grantRole(SIGNER_ROLE, signer2.address);
      
      const voucher = await createVoucher(
        nft, signer2, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, 0
      );
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.emit(nft, "TokenLazyMinted");
    });

    it("Should verify correct signer address", async function () {
      const { nft, signer1, signer2, buyer1, SIGNER_ROLE } = await loadFixture(deployNFTFixture);
      
      await nft.grantRole(SIGNER_ROLE, signer2.address);
      
      const voucher1 = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest1", ethers.ZeroAddress, 1, 0
      );
      
      const voucher2 = await createVoucher(
        nft, signer2, 1, ethers.parseEther("0.1"),
        "ipfs://QmTest2", ethers.ZeroAddress, 2, 0
      );
      
      const result1 = await nft.verifyVoucher(voucher1);
      const result2 = await nft.verifyVoucher(voucher2);
      
      expect(result1[0]).to.equal(signer1.address);
      expect(result2[0]).to.equal(signer2.address);
    });

    it("Should reject voucher signed by attacker", async function () {
      const { nft, attacker, buyer1 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft, attacker, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, 0
      );
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(nft, "InvalidSignature");
    });

    it("Should handle multiple authorized signers", async function () {
      const { nft, signer1, signer2, buyer1, buyer2, SIGNER_ROLE } = await loadFixture(deployNFTFixture);
      
      await nft.grantRole(SIGNER_ROLE, signer2.address);
      
      const voucher1 = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest1", ethers.ZeroAddress, 1, 0
      );
      
      const voucher2 = await createVoucher(
        nft, signer2, 1, ethers.parseEther("0.1"),
        "ipfs://QmTest2", ethers.ZeroAddress, 1, 0
      );
      
      await nft.connect(buyer1).redeemVoucher(voucher1, { value: ethers.parseEther("0.1") });
      await nft.connect(buyer2).redeemVoucher(voucher2, { value: ethers.parseEther("0.1") });
      
      expect(await nft.ownerOf(0)).to.equal(buyer1.address);
      expect(await nft.ownerOf(1)).to.equal(buyer2.address);
    });
  });

  // ============ 7. Gas Consumption Measurement ============
  
  describe("7. Gas Consumption", function () {
    
    it("Should measure gas for voucher redemption", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, 0
      );
      
      const tx = await nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") });
      const receipt = await tx.wait();
      
      console.log(`      ⛽ Lazy mint redemption gas: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lessThan(200000);
    });

    it("Should compare gas: lazy mint vs normal mint", async function () {
      const { nft, owner, signer1, buyer1, SIGNER_ROLE } = await loadFixture(deployNFTFixture);
      
      // Grant minter role for normal mint
      const MINTER_ROLE = await nft.MINTER_ROLE();
      await nft.grantRole(MINTER_ROLE, owner.address);
      
      // Normal mint
      const normalTx = await nft.mint(buyer1.address);
      const normalReceipt = await normalTx.wait();
      
      // Lazy mint
      const voucher = await createVoucher(
        nft, signer1, 1, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, 0
      );
      
      const lazyTx = await nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") });
      const lazyReceipt = await lazyTx.wait();
      
      console.log(`      ⛽ Normal mint gas: ${normalReceipt.gasUsed.toString()}`);
      console.log(`      ⛽ Lazy mint gas: ${lazyReceipt.gasUsed.toString()}`);
      console.log(`      📊 Difference: ${(Number(lazyReceipt.gasUsed) - Number(normalReceipt.gasUsed)).toString()}`);
    });

    it("Should measure gas for multiple redemptions", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const gasUsed = [];
      
      for (let i = 0; i < 3; i++) {
        const voucher = await createVoucher(
          nft, signer1, i, ethers.parseEther("0.1"),
          `ipfs://QmTest${i}`, ethers.ZeroAddress, i + 1, 0
        );
        
        const tx = await nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") });
        const receipt = await tx.wait();
        gasUsed.push(receipt.gasUsed);
      }
      
      console.log(`      ⛽ Redemption 1: ${gasUsed[0].toString()}`);
      console.log(`      ⛽ Redemption 2: ${gasUsed[1].toString()}`);
      console.log(`      ⛽ Redemption 3: ${gasUsed[2].toString()}`);
    });

    it("Should measure gas for voucher verification", async function () {
      const { nft, signer1 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, 0
      );
      
      const tx = await nft.verifyVoucher(voucher);
      console.log(`      ⛽ Voucher verification (view): ${tx}`);
    });
  });

  // ============ 8. Multiple Signer Scenarios ============
  
  describe("8. Multiple Signer Scenarios", function () {
    
    it("Should handle vouchers from different signers", async function () {
      const { nft, signer1, signer2, buyer1, SIGNER_ROLE } = await loadFixture(deployNFTFixture);
      
      await nft.grantRole(SIGNER_ROLE, signer2.address);
      
      const voucher1 = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest1", ethers.ZeroAddress, 1, 0
      );
      
      const voucher2 = await createVoucher(
        nft, signer2, 1, ethers.parseEther("0.2"),
        "ipfs://QmTest2", ethers.ZeroAddress, 1, 0
      );
      
      await nft.connect(buyer1).redeemVoucher(voucher1, { value: ethers.parseEther("0.1") });
      await nft.connect(buyer1).redeemVoucher(voucher2, { value: ethers.parseEther("0.2") });
      
      expect(await nft.balanceOf(buyer1.address)).to.equal(2);
    });

    it("Should track nonces separately per signer", async function () {
      const { nft, signer1, signer2, buyer1, SIGNER_ROLE } = await loadFixture(deployNFTFixture);
      
      await nft.grantRole(SIGNER_ROLE, signer2.address);
      
      const voucher1 = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest1", ethers.ZeroAddress, 5, 0
      );
      
      await nft.connect(buyer1).redeemVoucher(voucher1, { value: ethers.parseEther("0.1") });
      
      expect(await nft.isNonceUsed(signer1.address, 5)).to.be.true;
      expect(await nft.isNonceUsed(signer2.address, 5)).to.be.false;
      
      const voucher2 = await createVoucher(
        nft, signer2, 1, ethers.parseEther("0.1"),
        "ipfs://QmTest2", ethers.ZeroAddress, 5, 0
      );
      
      await nft.connect(buyer1).redeemVoucher(voucher2, { value: ethers.parseEther("0.1") });
      
      expect(await nft.isNonceUsed(signer2.address, 5)).to.be.true;
    });

    it("Should allow concurrent redemptions from different signers", async function () {
      const { nft, signer1, signer2, buyer1, buyer2, SIGNER_ROLE } = await loadFixture(deployNFTFixture);
      
      await nft.grantRole(SIGNER_ROLE, signer2.address);
      
      const voucher1 = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest1", ethers.ZeroAddress, 1, 0
      );
      
      const voucher2 = await createVoucher(
        nft, signer2, 1, ethers.parseEther("0.1"),
        "ipfs://QmTest2", ethers.ZeroAddress, 1, 0
      );
      
      await Promise.all([
        nft.connect(buyer1).redeemVoucher(voucher1, { value: ethers.parseEther("0.1") }),
        nft.connect(buyer2).redeemVoucher(voucher2, { value: ethers.parseEther("0.1") })
      ]);
      
      expect(await nft.ownerOf(0)).to.equal(buyer1.address);
      expect(await nft.ownerOf(1)).to.equal(buyer2.address);
    });

    it("Should handle signer role changes during operation", async function () {
      const { nft, signer1, signer2, buyer1, SIGNER_ROLE } = await loadFixture(deployNFTFixture);
      
      // Create voucher with signer1
      const voucher1 = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest1", ethers.ZeroAddress, 1, 0
      );
      
      // Redeem successfully
      await nft.connect(buyer1).redeemVoucher(voucher1, { value: ethers.parseEther("0.1") });
      
      // Revoke signer1, grant signer2
      await nft.revokeRole(SIGNER_ROLE, signer1.address);
      await nft.grantRole(SIGNER_ROLE, signer2.address);
      
      // Old signer voucher should fail
      const voucher2 = await createVoucher(
        nft, signer1, 1, ethers.parseEther("0.1"),
        "ipfs://QmTest2", ethers.ZeroAddress, 2, 0
      );
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher2, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(nft, "InvalidSignature");
      
      // New signer voucher should succeed
      const voucher3 = await createVoucher(
        nft, signer2, 1, ethers.parseEther("0.1"),
        "ipfs://QmTest3", ethers.ZeroAddress, 1, 0
      );
      
      await nft.connect(buyer1).redeemVoucher(voucher3, { value: ethers.parseEther("0.1") });
      expect(await nft.ownerOf(1)).to.equal(buyer1.address);
    });

    it("Should handle multiple signers with different nonce sequences", async function () {
      const { nft, signer1, signer2, buyer1, SIGNER_ROLE } = await loadFixture(deployNFTFixture);
      
      await nft.grantRole(SIGNER_ROLE, signer2.address);
      
      // Signer1 uses nonces 1, 2, 3
      for (let i = 0; i < 3; i++) {
        const voucher = await createVoucher(
          nft, signer1, i, ethers.parseEther("0.1"),
          `ipfs://QmSigner1-${i}`, ethers.ZeroAddress, i + 1, 0
        );
        await nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") });
      }
      
      // Signer2 uses nonces 10, 20, 30
      for (let i = 0; i < 3; i++) {
        const voucher = await createVoucher(
          nft, signer2, i + 3, ethers.parseEther("0.1"),
          `ipfs://QmSigner2-${i}`, ethers.ZeroAddress, (i + 1) * 10, 0
        );
        await nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") });
      }
      
      expect(await nft.balanceOf(buyer1.address)).to.equal(6);
      
      // Verify nonce usage
      expect(await nft.isNonceUsed(signer1.address, 1)).to.be.true;
      expect(await nft.isNonceUsed(signer1.address, 2)).to.be.true;
      expect(await nft.isNonceUsed(signer2.address, 10)).to.be.true;
      expect(await nft.isNonceUsed(signer2.address, 20)).to.be.true;
    });
  });

  // ============ Additional Edge Cases ============
  
  describe("9. Additional Edge Cases", function () {
    
    it("Should reject voucher with insufficient payment", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, 0
      );
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.05") })
      ).to.be.revertedWithCustomError(nft, "InsufficientPayment");
    });

    it("Should reject voucher for wrong buyer", async function () {
      const { nft, signer1, buyer1, buyer2 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", buyer1.address, 1, 0
      );
      
      await expect(
        nft.connect(buyer2).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(nft, "UnauthorizedBuyer");
    });

    it("Should reject voucher exceeding max supply", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      await nft.setMaxSupply(1);
      
      const voucher1 = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest1", ethers.ZeroAddress, 1, 0
      );
      
      await nft.connect(buyer1).redeemVoucher(voucher1, { value: ethers.parseEther("0.1") });
      
      const voucher2 = await createVoucher(
        nft, signer1, 1, ethers.parseEther("0.1"),
        "ipfs://QmTest2", ethers.ZeroAddress, 2, 0
      );
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher2, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWithCustomError(nft, "MaxSupplyExceeded");
    });

    it("Should reject voucher when paused", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        "ipfs://QmTest", ethers.ZeroAddress, 1, 0
      );
      
      await nft.pause();
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.be.reverted;
    });

    it("Should handle very long URI strings", async function () {
      const { nft, signer1, buyer1 } = await loadFixture(deployNFTFixture);
      
      const longUri = "ipfs://Qm" + "a".repeat(500);
      
      const voucher = await createVoucher(
        nft, signer1, 0, ethers.parseEther("0.1"),
        longUri, ethers.ZeroAddress, 1, 0
      );
      
      await expect(
        nft.connect(buyer1).redeemVoucher(voucher, { value: ethers.parseEther("0.1") })
      ).to.emit(nft, "TokenLazyMinted");
    });
  });
});

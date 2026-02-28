const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("NFTContract with Lazy Minting", function () {
  let nftContract;
  let owner, signer, buyer, unauthorized;
  let SIGNER_ROLE, MINTER_ROLE, ADMIN_ROLE;

  const NAME = "TestNFT";
  const SYMBOL = "TNFT";
  const BASE_URI = "ipfs://test/";
  const MAX_SUPPLY = 1000;
  const ROYALTY_FEE = 500; // 5%

  // EIP-712 Domain
  let domain;
  const types = {
    NFTVoucher: [
      { name: "tokenId", type: "uint256" },
      { name: "minPrice", type: "uint256" },
      { name: "uri", type: "string" },
      { name: "buyer", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "expiry", type: "uint256" },
    ],
  };

  beforeEach(async function () {
    [owner, signer, buyer, unauthorized] = await ethers.getSigners();

    const NFTContract = await ethers.getContractFactory("NFTContract");
    nftContract = await upgrades.deployProxy(
      NFTContract,
      [NAME, SYMBOL, BASE_URI, MAX_SUPPLY, owner.address, ROYALTY_FEE],
      { initializer: "initialize", kind: "uups" }
    );
    await nftContract.deployed();

    // Get role identifiers
    SIGNER_ROLE = await nftContract.SIGNER_ROLE();
    MINTER_ROLE = await nftContract.MINTER_ROLE();
    ADMIN_ROLE = await nftContract.ADMIN_ROLE();

    // Grant SIGNER_ROLE to signer account
    await nftContract.grantRole(SIGNER_ROLE, signer.address);

    // Setup EIP-712 domain
    const chainId = await ethers.provider.getNetwork().then((n) => n.chainId);
    domain = {
      name: NAME,
      version: "1",
      chainId: chainId,
      verifyingContract: nftContract.address,
    };
  });

  describe("Initialization", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await nftContract.name()).to.equal(NAME);
      expect(await nftContract.symbol()).to.equal(SYMBOL);
      expect(await nftContract.maxSupply()).to.equal(MAX_SUPPLY);
      expect(await nftContract.totalSupply()).to.equal(0);
    });

    it("Should grant roles to deployer", async function () {
      expect(await nftContract.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await nftContract.hasRole(MINTER_ROLE, owner.address)).to.be.true;
      expect(await nftContract.hasRole(SIGNER_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Standard Minting", function () {
    it("Should mint token with MINTER_ROLE", async function () {
      await expect(nftContract.mint(buyer.address))
        .to.emit(nftContract, "TokenMinted")
        .withArgs(buyer.address, 0, BASE_URI + "0");

      expect(await nftContract.ownerOf(0)).to.equal(buyer.address);
      expect(await nftContract.totalSupply()).to.equal(1);
    });

    it("Should fail to mint without MINTER_ROLE", async function () {
      await expect(
        nftContract.connect(unauthorized).mint(buyer.address)
      ).to.be.reverted;
    });

    it("Should batch mint multiple tokens", async function () {
      await nftContract.batchMint(buyer.address, 5);
      expect(await nftContract.totalSupply()).to.equal(5);
      expect(await nftContract.balanceOf(buyer.address)).to.equal(5);
    });
  });

  describe("Lazy Minting - Voucher Creation and Redemption", function () {
    it("Should redeem valid voucher", async function () {
      const voucher = {
        tokenId: 100,
        minPrice: ethers.utils.parseEther("0.1"),
        uri: "ipfs://token100",
        buyer: ethers.constants.AddressZero, // Anyone can redeem
        nonce: 1,
        expiry: 0, // No expiry
      };

      // Sign voucher
      const signature = await signer._signTypedData(domain, types, voucher);

      // Redeem voucher
      await expect(
        nftContract.connect(buyer).redeemVoucher(
          { ...voucher, signature },
          { value: ethers.utils.parseEther("0.1") }
        )
      )
        .to.emit(nftContract, "TokenLazyMinted")
        .withArgs(buyer.address, 100, ethers.utils.parseEther("0.1"), 1);

      expect(await nftContract.ownerOf(100)).to.equal(buyer.address);
    });

    it("Should fail with insufficient payment", async function () {
      const voucher = {
        tokenId: 101,
        minPrice: ethers.utils.parseEther("1.0"),
        uri: "ipfs://token101",
        buyer: ethers.constants.AddressZero,
        nonce: 2,
        expiry: 0,
      };

      const signature = await signer._signTypedData(domain, types, voucher);

      await expect(
        nftContract.connect(buyer).redeemVoucher(
          { ...voucher, signature },
          { value: ethers.utils.parseEther("0.5") }
        )
      ).to.be.revertedWithCustomError(nftContract, "InsufficientPayment");
    });

    it("Should fail with invalid signature", async function () {
      const voucher = {
        tokenId: 102,
        minPrice: ethers.utils.parseEther("0.1"),
        uri: "ipfs://token102",
        buyer: ethers.constants.AddressZero,
        nonce: 3,
        expiry: 0,
      };

      // Sign with unauthorized account
      const signature = await unauthorized._signTypedData(domain, types, voucher);

      await expect(
        nftContract.connect(buyer).redeemVoucher(
          { ...voucher, signature },
          { value: ethers.utils.parseEther("0.1") }
        )
      ).to.be.revertedWithCustomError(nftContract, "InvalidSignature");
    });

    it("Should prevent replay attacks with nonce", async function () {
      const voucher = {
        tokenId: 103,
        minPrice: ethers.utils.parseEther("0.1"),
        uri: "ipfs://token103",
        buyer: ethers.constants.AddressZero,
        nonce: 4,
        expiry: 0,
      };

      const signature = await signer._signTypedData(domain, types, voucher);

      // First redemption should succeed
      await nftContract.connect(buyer).redeemVoucher(
        { ...voucher, signature },
        { value: ethers.utils.parseEther("0.1") }
      );

      // Second redemption with same nonce should fail
      const voucher2 = { ...voucher, tokenId: 104 };
      const signature2 = await signer._signTypedData(domain, types, voucher2);

      await expect(
        nftContract.connect(buyer).redeemVoucher(
          { ...voucher2, signature: signature2 },
          { value: ethers.utils.parseEther("0.1") }
        )
      ).to.be.revertedWithCustomError(nftContract, "NonceAlreadyUsed");
    });

    it("Should enforce buyer restriction", async function () {
      const voucher = {
        tokenId: 105,
        minPrice: ethers.utils.parseEther("0.1"),
        uri: "ipfs://token105",
        buyer: buyer.address, // Only buyer can redeem
        nonce: 5,
        expiry: 0,
      };

      const signature = await signer._signTypedData(domain, types, voucher);

      // Unauthorized user tries to redeem
      await expect(
        nftContract.connect(unauthorized).redeemVoucher(
          { ...voucher, signature },
          { value: ethers.utils.parseEther("0.1") }
        )
      ).to.be.revertedWithCustomError(nftContract, "UnauthorizedBuyer");

      // Authorized buyer succeeds
      await expect(
        nftContract.connect(buyer).redeemVoucher(
          { ...voucher, signature },
          { value: ethers.utils.parseEther("0.1") }
        )
      ).to.emit(nftContract, "TokenLazyMinted");
    });

    it("Should enforce expiry timestamp", async function () {
      const currentTime = Math.floor(Date.now() / 1000);
      const voucher = {
        tokenId: 106,
        minPrice: ethers.utils.parseEther("0.1"),
        uri: "ipfs://token106",
        buyer: ethers.constants.AddressZero,
        nonce: 6,
        expiry: currentTime - 3600, // Expired 1 hour ago
      };

      const signature = await signer._signTypedData(domain, types, voucher);

      await expect(
        nftContract.connect(buyer).redeemVoucher(
          { ...voucher, signature },
          { value: ethers.utils.parseEther("0.1") }
        )
      ).to.be.revertedWithCustomError(nftContract, "VoucherExpired");
    });

    it("Should prevent minting already minted token", async function () {
      // First mint token 107 normally
      await nftContract.mint(owner.address);
      const tokenId = 0;

      // Try to redeem voucher for same token
      const voucher = {
        tokenId: tokenId,
        minPrice: ethers.utils.parseEther("0.1"),
        uri: "ipfs://token0",
        buyer: ethers.constants.AddressZero,
        nonce: 7,
        expiry: 0,
      };

      const signature = await signer._signTypedData(domain, types, voucher);

      await expect(
        nftContract.connect(buyer).redeemVoucher(
          { ...voucher, signature },
          { value: ethers.utils.parseEther("0.1") }
        )
      ).to.be.revertedWithCustomError(nftContract, "TokenAlreadyMinted");
    });
  });

  describe("Nonce Management", function () {
    it("Should check if nonce is used", async function () {
      expect(await nftContract.isNonceUsed(signer.address, 100)).to.be.false;

      const voucher = {
        tokenId: 200,
        minPrice: ethers.utils.parseEther("0.1"),
        uri: "ipfs://token200",
        buyer: ethers.constants.AddressZero,
        nonce: 100,
        expiry: 0,
      };

      const signature = await signer._signTypedData(domain, types, voucher);

      await nftContract.connect(buyer).redeemVoucher(
        { ...voucher, signature },
        { value: ethers.utils.parseEther("0.1") }
      );

      expect(await nftContract.isNonceUsed(signer.address, 100)).to.be.true;
    });

    it("Should allow manual nonce invalidation", async function () {
      await expect(nftContract.connect(signer).invalidateNonce(999))
        .to.emit(nftContract, "NonceInvalidated")
        .withArgs(signer.address, 999);

      expect(await nftContract.isNonceUsed(signer.address, 999)).to.be.true;
    });
  });

  describe("Voucher Verification", function () {
    it("Should verify valid voucher", async function () {
      const voucher = {
        tokenId: 300,
        minPrice: ethers.utils.parseEther("0.1"),
        uri: "ipfs://token300",
        buyer: ethers.constants.AddressZero,
        nonce: 200,
        expiry: 0,
      };

      const signature = await signer._signTypedData(domain, types, voucher);

      const [recoveredSigner, isValid] = await nftContract.verifyVoucher({
        ...voucher,
        signature,
      });

      expect(recoveredSigner).to.equal(signer.address);
      expect(isValid).to.be.true;
    });

    it("Should return domain separator", async function () {
      const domainSeparator = await nftContract.getDomainSeparator();
      expect(domainSeparator).to.not.equal(ethers.constants.HashZero);
    });
  });

  describe("Withdrawal", function () {
    it("Should allow admin to withdraw funds", async function () {
      // Redeem a voucher to add funds to contract
      const voucher = {
        tokenId: 400,
        minPrice: ethers.utils.parseEther("1.0"),
        uri: "ipfs://token400",
        buyer: ethers.constants.AddressZero,
        nonce: 300,
        expiry: 0,
      };

      const signature = await signer._signTypedData(domain, types, voucher);

      await nftContract.connect(buyer).redeemVoucher(
        { ...voucher, signature },
        { value: ethers.utils.parseEther("1.0") }
      );

      const contractBalance = await ethers.provider.getBalance(nftContract.address);
      expect(contractBalance).to.equal(ethers.utils.parseEther("1.0"));

      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      await nftContract.withdraw();
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
    });
  });

  describe("Pausable", function () {
    it("Should prevent redemption when paused", async function () {
      await nftContract.pause();

      const voucher = {
        tokenId: 500,
        minPrice: ethers.utils.parseEther("0.1"),
        uri: "ipfs://token500",
        buyer: ethers.constants.AddressZero,
        nonce: 400,
        expiry: 0,
      };

      const signature = await signer._signTypedData(domain, types, voucher);

      await expect(
        nftContract.connect(buyer).redeemVoucher(
          { ...voucher, signature },
          { value: ethers.utils.parseEther("0.1") }
        )
      ).to.be.revertedWith("Pausable: paused");
    });
  });
});

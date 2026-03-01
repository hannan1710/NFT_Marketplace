const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("NFTContract", function () {
  async function deployNFTFixture() {
    const [owner, minter, user1, user2] = await ethers.getSigners();

    const NFTContract = await ethers.getContractFactory("NFTContract");
    const nft = await upgrades.deployProxy(
      NFTContract,
      ["Test NFT", "TNFT", "https://api.example.com/metadata/", 10000, owner.address, 500],
      { initializer: "initialize", kind: "uups" }
    );
    await nft.waitForDeployment();

    const MINTER_ROLE = await nft.MINTER_ROLE();
    const ADMIN_ROLE = await nft.ADMIN_ROLE();

    return { nft, owner, minter, user1, user2, MINTER_ROLE, ADMIN_ROLE };
  }

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      const { nft } = await loadFixture(deployNFTFixture);
      expect(await nft.name()).to.equal("Test NFT");
      expect(await nft.symbol()).to.equal("TNFT");
    });

    it("Should set the correct max supply", async function () {
      const { nft } = await loadFixture(deployNFTFixture);
      expect(await nft.maxSupply()).to.equal(10000);
    });

    it("Should grant admin role to deployer", async function () {
      const { nft, owner, ADMIN_ROLE } = await loadFixture(deployNFTFixture);
      expect(await nft.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    it("Should mint NFT with minter role", async function () {
      const { nft, owner, minter, user1, MINTER_ROLE } = await loadFixture(deployNFTFixture);
      
      await nft.grantRole(MINTER_ROLE, minter.address);
      
      await expect(nft.connect(minter).mint(user1.address))
        .to.emit(nft, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, 0);

      expect(await nft.ownerOf(0)).to.equal(user1.address);
    });

    it("Should fail to mint without minter role", async function () {
      const { nft, user1 } = await loadFixture(deployNFTFixture);
      
      await expect(
        nft.connect(user1).mint(user1.address)
      ).to.be.reverted;
    });

    it("Should fail to mint beyond max supply", async function () {
      const { nft, owner, MINTER_ROLE } = await loadFixture(deployNFTFixture);
      
      await nft.grantRole(MINTER_ROLE, owner.address);
      
      // Set max supply to 1
      await nft.setMaxSupply(1);
      
      // Mint first NFT
      await nft.mint(owner.address);
      
      // Try to mint second NFT
      await expect(
        nft.mint(owner.address)
      ).to.be.revertedWithCustomError(nft, "MaxSupplyExceeded");
    });

    it("Should increment total supply correctly", async function () {
      const { nft, owner, MINTER_ROLE } = await loadFixture(deployNFTFixture);
      
      await nft.grantRole(MINTER_ROLE, owner.address);
      
      expect(await nft.totalSupply()).to.equal(0);
      
      await nft.mint(owner.address);
      expect(await nft.totalSupply()).to.equal(1);
      
      await nft.mint(owner.address);
      expect(await nft.totalSupply()).to.equal(2);
    });
  });

  describe("Royalties", function () {
    it("Should set royalty info correctly", async function () {
      const { nft, owner, user1, MINTER_ROLE } = await loadFixture(deployNFTFixture);
      
      await nft.grantRole(MINTER_ROLE, owner.address);
      await nft.mint(user1.address);
      
      const salePrice = ethers.parseEther("1");
      const [receiver, royaltyAmount] = await nft.royaltyInfo(0, salePrice);
      
      expect(receiver).to.equal(owner.address); // Default royalty receiver from deployment
      expect(royaltyAmount).to.equal(ethers.parseEther("0.05")); // 5% of 1 ETH
    });

    it("Should update default royalty", async function () {
      const { nft, owner, user1 } = await loadFixture(deployNFTFixture);
      
      await nft.setDefaultRoyalty(user1.address, 1000); // 10%
      
      const salePrice = ethers.parseEther("1");
      const [receiver, royaltyAmount] = await nft.royaltyInfo(0, salePrice);
      
      expect(receiver).to.equal(user1.address);
      expect(royaltyAmount).to.equal(ethers.parseEther("0.1")); // 10% of 1 ETH
    });
  });

  describe("Pause", function () {
    it("Should pause and unpause transfers", async function () {
      const { nft, owner, user1, user2, MINTER_ROLE } = await loadFixture(deployNFTFixture);
      
      await nft.grantRole(MINTER_ROLE, owner.address);
      await nft.mint(user1.address);
      
      await nft.pause();
      
      await expect(
        nft.connect(user1).transferFrom(user1.address, user2.address, 0)
      ).to.be.reverted;
      
      await nft.unpause();
      
      await nft.connect(user1).transferFrom(user1.address, user2.address, 0);
      expect(await nft.ownerOf(0)).to.equal(user2.address);
    });
  });

  describe("Upgrades", function () {
    it("Should upgrade contract", async function () {
      const { nft, owner } = await loadFixture(deployNFTFixture);
      
      const NFTContractV2 = await ethers.getContractFactory("NFTContract");
      const upgraded = await upgrades.upgradeProxy(await nft.getAddress(), NFTContractV2);
      
      expect(await upgraded.name()).to.equal("Test NFT");
      expect(await upgraded.symbol()).to.equal("TNFT");
    });

    it("Should only allow admin to upgrade", async function () {
      const { nft, user1 } = await loadFixture(deployNFTFixture);
      
      const NFTContractV2 = await ethers.getContractFactory("NFTContract", user1);
      
      await expect(
        upgrades.upgradeProxy(await nft.getAddress(), NFTContractV2)
      ).to.be.reverted;
    });
  });

  describe("Base URI", function () {
    it("Should update base URI", async function () {
      const { nft, owner, MINTER_ROLE } = await loadFixture(deployNFTFixture);
      
      await nft.grantRole(MINTER_ROLE, owner.address);
      await nft.mint(owner.address);
      
      await nft.setBaseURI("https://newapi.example.com/metadata/");
      
      expect(await nft.tokenURI(0)).to.equal("https://newapi.example.com/metadata/0");
    });
  });
});

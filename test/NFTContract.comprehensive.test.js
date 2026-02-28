const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("NFTContract - Comprehensive Tests", function () {
  // Fixture for deploying the contract
  async function deployNFTFixture() {
    const [owner, minter, user1, user2, royaltyRecipient] = await ethers.getSigners();

    const NFTContract = await ethers.getContractFactory("NFTContract");
    const nft = await upgrades.deployProxy(
      NFTContract,
      ["Test NFT", "TNFT", "ipfs://base/"],
      { initializer: "initialize", kind: "uups" }
    );
    await nft.waitForDeployment();

    return { nft, owner, minter, user1, user2, royaltyRecipient };
  }

  describe("Deployment & Initialization", function () {
    it("Should deploy with correct name and symbol", async function () {
      const { nft } = await loadFixture(deployNFTFixture);
      expect(await nft.name()).to.equal("Test NFT");
      expect(await nft.symbol()).to.equal("TNFT");
    });

    it("Should set correct owner", async function () {
      const { nft, owner } = await loadFixture(deployNFTFixture);
      const DEFAULT_ADMIN_ROLE = await nft.DEFAULT_ADMIN_ROLE();
      expect(await nft.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should set correct base URI", async function () {
      const { nft } = await loadFixture(deployNFTFixture);
      // Base URI is internal, test via tokenURI after minting
      await nft.safeMint(await ethers.provider.getSigner(0).getAddress(), "test");
      const tokenURI = await nft.tokenURI(0);
      expect(tokenURI).to.include("ipfs://base/");
    });

    it("Should not allow re-initialization", async function () {
      const { nft } = await loadFixture(deployNFTFixture);
      await expect(
        nft.initialize("New Name", "NEW", "ipfs://new/")
      ).to.be.revertedWithCustomError(nft, "InvalidInitialization");
    });
  });

  describe("Minting", function () {
    it("Should mint NFT with correct token ID", async function () {
      const { nft, owner } = await loadFixture(deployNFTFixture);
      await nft.safeMint(owner.address, "metadata1");
      expect(await nft.ownerOf(0)).to.equal(owner.address);
      expect(await nft.balanceOf(owner.address)).to.equal(1);
    });

    it("Should increment token IDs correctly", async function () {
      const { nft, owner, user1 } = await loadFixture(deployNFTFixture);
      await nft.safeMint(owner.address, "metadata1");
      await nft.safeMint(user1.address, "metadata2");
      
      expect(await nft.ownerOf(0)).to.equal(owner.address);
      expect(await nft.ownerOf(1)).to.equal(user1.address);
    });

    it("Should only allow minter role to mint", async function () {
      const { nft, user1 } = await loadFixture(deployNFTFixture);
      await expect(
        nft.connect(user1).safeMint(user1.address, "metadata")
      ).to.be.reverted;
    });

    it("Should emit Transfer event on mint", async function () {
      const { nft, owner } = await loadFixture(deployNFTFixture);
      await expect(nft.safeMint(owner.address, "metadata"))
        .to.emit(nft, "Transfer")
        .withArgs(ethers.ZeroAddress, owner.address, 0);
    });
  });

  describe("Lazy Minting", function () {
    it("Should create valid voucher", async function () {
      const { nft, owner } = await loadFixture(deployNFTFixture);
      const tokenId = 0;
      const uri = "ipfs://test";
      const minPrice = ethers.parseEther("0.1");

      const domain = {
        name: await nft.name(),
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await nft.getAddress(),
      };

      const types = {
        NFTVoucher: [
          { name: "tokenId", type: "uint256" },
          { name: "uri", type: "string" },
          { name: "minPrice", type: "uint256" },
        ],
      };

      const voucher = { tokenId, uri, minPrice };
      const signature = await owner.signTypedData(domain, types, voucher);

      expect(signature).to.be.a("string");
      expect(signature.length).to.equal(132); // 0x + 130 chars
    });

    it("Should redeem valid voucher", async function () {
      const { nft, owner, user1 } = await loadFixture(deployNFTFixture);
      const tokenId = 0;
      const uri = "ipfs://test";
      const minPrice = ethers.parseEther("0.1");

      const domain = {
        name: await nft.name(),
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await nft.getAddress(),
      };

      const types = {
        NFTVoucher: [
          { name: "tokenId", type: "uint256" },
          { name: "uri", type: "string" },
          { name: "minPrice", type: "uint256" },
        ],
      };

      const voucher = { tokenId, uri, minPrice };
      const signature = await owner.signTypedData(domain, types, voucher);

      await nft.connect(user1).redeem(voucher, signature, { value: minPrice });
      expect(await nft.ownerOf(tokenId)).to.equal(user1.address);
    });

    it("Should reject voucher with insufficient payment", async function () {
      const { nft, owner, user1 } = await loadFixture(deployNFTFixture);
      const tokenId = 0;
      const uri = "ipfs://test";
      const minPrice = ethers.parseEther("0.1");

      const domain = {
        name: await nft.name(),
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await nft.getAddress(),
      };

      const types = {
        NFTVoucher: [
          { name: "tokenId", type: "uint256" },
          { name: "uri", type: "string" },
          { name: "minPrice", type: "uint256" },
        ],
      };

      const voucher = { tokenId, uri, minPrice };
      const signature = await owner.signTypedData(domain, types, voucher);

      await expect(
        nft.connect(user1).redeem(voucher, signature, { value: ethers.parseEther("0.05") })
      ).to.be.revertedWith("Insufficient payment");
    });
  });

  describe("Royalties", function () {
    it("Should set default royalty", async function () {
      const { nft, royaltyRecipient } = await loadFixture(deployNFTFixture);
      await nft.setDefaultRoyalty(royaltyRecipient.address, 500); // 5%

      await nft.safeMint(royaltyRecipient.address, "metadata");
      const [receiver, amount] = await nft.royaltyInfo(0, ethers.parseEther("1"));

      expect(receiver).to.equal(royaltyRecipient.address);
      expect(amount).to.equal(ethers.parseEther("0.05")); // 5% of 1 ETH
    });

    it("Should set token-specific royalty", async function () {
      const { nft, owner, royaltyRecipient } = await loadFixture(deployNFTFixture);
      await nft.safeMint(owner.address, "metadata");
      
      await nft.setTokenRoyalty(0, royaltyRecipient.address, 1000); // 10%
      const [receiver, amount] = await nft.royaltyInfo(0, ethers.parseEther("1"));

      expect(receiver).to.equal(royaltyRecipient.address);
      expect(amount).to.equal(ethers.parseEther("0.1")); // 10% of 1 ETH
    });

    it("Should only allow admin to set royalties", async function () {
      const { nft, user1, royaltyRecipient } = await loadFixture(deployNFTFixture);
      await expect(
        nft.connect(user1).setDefaultRoyalty(royaltyRecipient.address, 500)
      ).to.be.reverted;
    });
  });

  describe("Role Management", function () {
    it("Should grant minter role", async function () {
      const { nft, owner, minter } = await loadFixture(deployNFTFixture);
      const MINTER_ROLE = await nft.MINTER_ROLE();
      
      await nft.grantRole(MINTER_ROLE, minter.address);
      expect(await nft.hasRole(MINTER_ROLE, minter.address)).to.be.true;
    });

    it("Should allow minter to mint", async function () {
      const { nft, owner, minter, user1 } = await loadFixture(deployNFTFixture);
      const MINTER_ROLE = await nft.MINTER_ROLE();
      
      await nft.grantRole(MINTER_ROLE, minter.address);
      await nft.connect(minter).safeMint(user1.address, "metadata");
      
      expect(await nft.ownerOf(0)).to.equal(user1.address);
    });

    it("Should revoke minter role", async function () {
      const { nft, owner, minter } = await loadFixture(deployNFTFixture);
      const MINTER_ROLE = await nft.MINTER_ROLE();
      
      await nft.grantRole(MINTER_ROLE, minter.address);
      await nft.revokeRole(MINTER_ROLE, minter.address);
      
      expect(await nft.hasRole(MINTER_ROLE, minter.address)).to.be.false;
    });
  });

  describe("Pausable", function () {
    it("Should pause contract", async function () {
      const { nft, owner } = await loadFixture(deployNFTFixture);
      await nft.pause();
      expect(await nft.paused()).to.be.true;
    });

    it("Should prevent transfers when paused", async function () {
      const { nft, owner, user1 } = await loadFixture(deployNFTFixture);
      await nft.safeMint(owner.address, "metadata");
      await nft.pause();

      await expect(
        nft.transferFrom(owner.address, user1.address, 0)
      ).to.be.revertedWithCustomError(nft, "EnforcedPause");
    });

    it("Should unpause contract", async function () {
      const { nft } = await loadFixture(deployNFTFixture);
      await nft.pause();
      await nft.unpause();
      expect(await nft.paused()).to.be.false;
    });

    it("Should only allow admin to pause", async function () {
      const { nft, user1 } = await loadFixture(deployNFTFixture);
      await expect(nft.connect(user1).pause()).to.be.reverted;
    });
  });

  describe("Upgradability", function () {
    it("Should upgrade to new implementation", async function () {
      const { nft, owner } = await loadFixture(deployNFTFixture);
      const NFTContractV2 = await ethers.getContractFactory("NFTContract");
      
      const upgraded = await upgrades.upgradeProxy(await nft.getAddress(), NFTContractV2);
      expect(await upgraded.name()).to.equal("Test NFT");
    });

    it("Should preserve state after upgrade", async function () {
      const { nft, owner } = await loadFixture(deployNFTFixture);
      await nft.safeMint(owner.address, "metadata");
      
      const NFTContractV2 = await ethers.getContractFactory("NFTContract");
      const upgraded = await upgrades.upgradeProxy(await nft.getAddress(), NFTContractV2);
      
      expect(await upgraded.ownerOf(0)).to.equal(owner.address);
    });

    it("Should only allow admin to upgrade", async function () {
      const { nft, user1 } = await loadFixture(deployNFTFixture);
      const NFTContractV2 = await ethers.getContractFactory("NFTContract", user1);
      
      await expect(
        upgrades.upgradeProxy(await nft.getAddress(), NFTContractV2)
      ).to.be.reverted;
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should measure gas for single mint", async function () {
      const { nft, owner } = await loadFixture(deployNFTFixture);
      const tx = await nft.safeMint(owner.address, "metadata");
      const receipt = await tx.wait();
      console.log("      Gas used for single mint:", receipt.gasUsed.toString());
      expect(receipt.gasUsed).to.be.lessThan(200000);
    });

    it("Should measure gas for batch minting", async function () {
      const { nft, owner } = await loadFixture(deployNFTFixture);
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(nft.safeMint(owner.address, `metadata${i}`));
      }
      const txs = await Promise.all(promises);
      const receipts = await Promise.all(txs.map(tx => tx.wait()));
      const totalGas = receipts.reduce((sum, r) => sum + r.gasUsed, 0n);
      console.log("      Gas used for 5 mints:", totalGas.toString());
      console.log("      Average per mint:", (totalGas / 5n).toString());
    });
  });

  describe("Edge Cases", function () {
    it("Should handle empty URI", async function () {
      const { nft, owner } = await loadFixture(deployNFTFixture);
      await nft.safeMint(owner.address, "");
      const tokenURI = await nft.tokenURI(0);
      expect(tokenURI).to.be.a("string");
    });

    it("Should reject query for non-existent token", async function () {
      const { nft } = await loadFixture(deployNFTFixture);
      await expect(nft.ownerOf(999)).to.be.revertedWithCustomError(nft, "ERC721NonexistentToken");
    });

    it("Should handle maximum royalty percentage", async function () {
      const { nft, royaltyRecipient } = await loadFixture(deployNFTFixture);
      await nft.setDefaultRoyalty(royaltyRecipient.address, 10000); // 100%
      
      await nft.safeMint(royaltyRecipient.address, "metadata");
      const [, amount] = await nft.royaltyInfo(0, ethers.parseEther("1"));
      expect(amount).to.equal(ethers.parseEther("1"));
    });
  });
});

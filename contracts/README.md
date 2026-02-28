# Smart Contracts

This directory contains the production-grade smart contracts for the NFT ecosystem.

## Contracts

### NFTContract.sol
ERC-721 NFT contract with lazy minting capabilities.

**Features:**
- ERC-721 standard implementation
- UUPS upgradeable pattern
- ERC-2981 royalty standard
- EIP-712 lazy minting with signed vouchers
- Role-based access control (ADMIN_ROLE, MINTER_ROLE, SIGNER_ROLE)
- Pausable functionality
- Reentrancy protection
- Batch minting support
- Nonce-based replay attack prevention

**Key Functions:**
- `mint(address to)` - Standard minting
- `batchMint(address to, uint256 quantity)` - Batch minting
- `redeemVoucher(NFTVoucher calldata voucher)` - Lazy minting
- `verifyVoucher(NFTVoucher calldata voucher)` - Verify voucher validity

**Gas Cost:** ~100,000 per mint

### NFTMarketplace.sol
Decentralized marketplace for trading NFTs.

**Features:**
- Fixed price listings
- English auction system
- Escrow-based (approval model)
- Automatic royalty distribution (ERC-2981)
- Configurable marketplace fees (max 10%)
- Bid refund mechanism
- UUPS upgradeable
- Reentrancy protection
- Role-based admin controls

**Key Functions:**
- `createListing(address nftContract, uint256 tokenId, uint256 price)` - Create listing
- `purchaseListing(uint256 listingId)` - Buy NFT
- `createAuction(address nftContract, uint256 tokenId, uint256 startPrice, uint256 duration)` - Create auction
- `placeBid(uint256 auctionId)` - Place bid
- `finalizeAuction(uint256 auctionId)` - Finalize auction

**Gas Cost:** ~100,000 per listing, ~150,000 per purchase

## Architecture

```
NFTContract (ERC-721)
├── Standard Minting (MINTER_ROLE)
├── Lazy Minting (SIGNER_ROLE)
├── Royalty Management (ADMIN_ROLE)
└── Upgradeable (UUPS)

NFTMarketplace
├── Fixed Price Listings
│   ├── Create
│   ├── Purchase
│   ├── Cancel
│   └── Update Price
├── Auctions
│   ├── Create
│   ├── Bid
│   ├── Finalize
│   └── Cancel
├── Fee Distribution
│   ├── Marketplace Fee
│   ├── Royalty (ERC-2981)
│   └── Seller Proceeds
└── Upgradeable (UUPS)
```

## Deployment

### NFT Contract
```bash
npm run deploy:sepolia
```

### Marketplace
```bash
npm run deploy:marketplace:sepolia
```

## Testing

```bash
npm run test
```

## Security

Both contracts implement:
- ✅ Reentrancy guards
- ✅ Access control
- ✅ Input validation
- ✅ Pausable mechanism
- ✅ Custom errors (gas efficient)
- ✅ Comprehensive events

## Upgradeability

Both contracts use UUPS pattern:
- Proxy address remains constant
- Implementation can be upgraded
- Requires ADMIN_ROLE
- State preserved across upgrades

## Dependencies

- OpenZeppelin Contracts Upgradeable v5.0.0
- Solidity ^0.8.20

## License

MIT

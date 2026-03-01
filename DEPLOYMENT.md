# Production Deployment Guide

Complete guide for deploying and managing the NFT Marketplace smart contracts in production.

## Prerequisites

1. Node.js v18+ installed
2. Hardhat configured
3. Funded deployer wallet
4. RPC endpoints (Alchemy, Infura, etc.)
5. Etherscan API keys for verification

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.production.example .env
```

Edit `.env` and fill in:
- `PRIVATE_KEY`: Your deployer wallet private key
- `MAINNET_RPC_URL`: Your Ethereum mainnet RPC URL
- `SEPOLIA_RPC_URL`: Your Sepolia testnet RPC URL
- `ETHERSCAN_API_KEY`: Your Etherscan API key
- Contract configuration (NFT_NAME, NFT_SYMBOL, etc.)

### 3. Run Tests

Before deploying, ensure all tests pass:

```bash
# Run all tests
npm test

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run coverage
npx hardhat coverage
```

## Deployment

### Testnet Deployment (Sepolia)

1. Deploy contracts:

```bash
npx hardhat run scripts/deployProduction.js --network sepolia
```

2. Verify contracts:

```bash
npx hardhat run scripts/verify.js --network sepolia
```

3. Grant roles:

```bash
# Set addresses in .env first
ADMIN_ADDRESSES=0xAddress1,0xAddress2
MINTER_ADDRESSES=0xAddress3,0xAddress4

npx hardhat run scripts/grantRoles.js --network sepolia
```

### Mainnet Deployment

⚠️ **WARNING**: Deploying to mainnet costs real ETH. Double-check everything!

1. Review configuration in `.env`
2. Ensure deployer wallet has sufficient ETH
3. Deploy:

```bash
npx hardhat run scripts/deployProduction.js --network mainnet
```

4. Verify contracts:

```bash
npx hardhat run scripts/verify.js --network mainnet
```

5. Grant roles:

```bash
npx hardhat run scripts/grantRoles.js --network mainnet
```

## Post-Deployment

### 1. Update Frontend

Update your frontend `.env.local` with deployed addresses:

```env
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=0x...
```

### 2. Verify on Etherscan

Contracts should be automatically verified, but you can manually verify:

```bash
npx hardhat verify --network mainnet DEPLOYED_ADDRESS
```

### 3. Test Functionality

- Mint test NFT
- Create listing
- Purchase NFT
- Create auction
- Place bid

## Upgrading Contracts

The contracts use UUPS upgradeable pattern. To upgrade:

1. Make changes to contract code
2. Run tests to ensure compatibility
3. Deploy upgrade:

```bash
npx hardhat run scripts/upgrade.js --network mainnet
```

4. Verify new implementation:

```bash
npx hardhat run scripts/verify.js --network mainnet
```

## Gas Optimization

### Check Contract Sizes

```bash
CONTRACT_SIZER=true npx hardhat compile
```

### Gas Reporting

```bash
REPORT_GAS=true npx hardhat test
```

## Security Checklist

- [ ] All tests passing
- [ ] Code audited (if possible)
- [ ] Access controls verified
- [ ] Upgrade mechanism tested
- [ ] Emergency pause tested
- [ ] Reentrancy guards in place
- [ ] Integer overflow checks
- [ ] Private keys secured
- [ ] Multi-sig for admin functions (recommended)

## Monitoring

### Events to Monitor

- `Transfer`: NFT transfers
- `ListingCreated`: New marketplace listings
- `ListingPurchased`: NFT sales
- `AuctionCreated`: New auctions
- `BidPlaced`: Auction bids
- `RoleGranted`: Permission changes

### Recommended Tools

- Etherscan for transaction monitoring
- Tenderly for debugging
- OpenZeppelin Defender for automation
- Dune Analytics for metrics

## Troubleshooting

### Deployment Fails

- Check deployer has sufficient ETH
- Verify RPC endpoint is working
- Check gas price settings
- Ensure contract size is under limit

### Verification Fails

- Wait a few minutes after deployment
- Check Etherscan API key is valid
- Verify constructor arguments match
- Try manual verification on Etherscan

### Upgrade Fails

- Ensure deployer has admin role
- Check new contract is compatible
- Verify storage layout hasn't changed
- Test upgrade on testnet first

## Networks

### Ethereum Mainnet
- Chain ID: 1
- Explorer: https://etherscan.io

### Sepolia Testnet
- Chain ID: 11155111
- Explorer: https://sepolia.etherscan.io
- Faucet: https://sepoliafaucet.com

### Polygon Mainnet
- Chain ID: 137
- Explorer: https://polygonscan.com

### Polygon Mumbai
- Chain ID: 80001
- Explorer: https://mumbai.polygonscan.com
- Faucet: https://faucet.polygon.technology

## Support

For issues or questions:
1. Check Hardhat documentation
2. Review OpenZeppelin docs
3. Check deployment logs in `deployments/` folder
4. Review transaction on block explorer

## License

MIT

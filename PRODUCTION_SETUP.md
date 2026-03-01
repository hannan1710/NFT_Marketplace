# Production Hardhat Setup - Complete Guide

This is a production-ready Hardhat setup with comprehensive testing, gas reporting, contract verification, and deployment scripts.

## 📁 Project Structure

```
├── contracts/              # Smart contracts
├── test/                   # Test files
│   ├── NFTContract.test.js
│   └── NFTMarketplace.test.js
├── scripts/
│   ├── deploy.js          # Local deployment
│   ├── deployProduction.js # Production deployment
│   ├── upgrade.js         # UUPS upgrade script
│   ├── verify.js          # Contract verification
│   ├── grantRoles.js      # Role management
│   ├── runTests.sh        # Test runner
│   └── testCoverage.sh    # Coverage runner
├── deployments/           # Deployment artifacts
├── .env.production.example # Environment template
├── hardhat.config.js      # Hardhat configuration
├── DEPLOYMENT.md          # Deployment guide
└── package.json           # NPM scripts
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.production.example .env
```

Edit `.env` with your configuration:
- Private keys
- RPC URLs
- API keys
- Contract parameters

### 3. Compile Contracts

```bash
npm run compile
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Run with gas reporting
npm run test:gas

# Run coverage
npm run test:coverage

# Check contract sizes
npm run size
```

## 🧪 Testing

### Test Coverage

The test suite includes:

**NFTContract Tests:**
- ✅ Deployment configuration
- ✅ Minting with roles
- ✅ Royalty management
- ✅ Burning functionality
- ✅ Pause/unpause
- ✅ UUPS upgrades
- ✅ Base URI updates

**NFTMarketplace Tests:**
- ✅ Listing creation
- ✅ NFT purchases
- ✅ Listing cancellation
- ✅ Price updates
- ✅ Auction creation
- ✅ Bid placement
- ✅ Auction finalization
- ✅ Fee distribution
- ✅ Admin functions

### Run Tests

```bash
# All tests
npm test

# With gas reporting
npm run test:gas

# Save gas report to file
npm run test:gas:file

# Coverage report
npm run test:coverage

# Parallel execution
npm run test:parallel
```

### Coverage Report

After running coverage, open `coverage/index.html` to view detailed coverage metrics.

Target: >90% coverage on all contracts

## 📊 Gas Reporting

Gas reporting is configured in `hardhat.config.js`:

```bash
# Enable gas reporting
REPORT_GAS=true npm test

# Save to file
npm run test:gas:file
```

Gas report includes:
- Method gas costs
- Deployment costs
- Average/min/max gas usage
- USD cost estimates (with CoinMarketCap API)

## 🔧 Contract Size Check

Check if contracts are under the 24KB limit:

```bash
npm run size
```

If contracts are too large:
- Enable optimizer with more runs
- Split into multiple contracts
- Remove unused code
- Use libraries

## 🌐 Deployment

### Local Deployment

```bash
# Start local node
npm run node

# Deploy (in another terminal)
npm run deploy:local
```

### Testnet Deployment (Sepolia)

```bash
npm run deploy:sepolia
```

### Mainnet Deployment

```bash
npm run deploy:mainnet
```

Deployment saves artifacts to `deployments/` folder:
- `{network}-{timestamp}.json` - Timestamped deployment
- `{network}-latest.json` - Latest deployment

## ✅ Contract Verification

Verify contracts on Etherscan:

```bash
# Verify on Sepolia
npm run verify:sepolia

# Verify on Mainnet
npm run verify:mainnet

# Verify on Polygon
npm run verify:polygon
```

Verification requires:
- Etherscan API key in `.env`
- Deployed contract addresses
- Wait ~1 minute after deployment

## 🔄 Upgrading Contracts (UUPS)

The contracts use UUPS upgradeable pattern:

```bash
# Upgrade on Sepolia
npm run upgrade:sepolia

# Upgrade on Mainnet
npm run upgrade:mainnet
```

Upgrade process:
1. Loads existing deployment
2. Deploys new implementation
3. Updates proxy to point to new implementation
4. Saves upgrade info

**Important:** Test upgrades on testnet first!

## 🔐 Role Management

Grant admin and minter roles:

```bash
# Set addresses in .env
ADMIN_ADDRESSES=0xAddress1,0xAddress2
MINTER_ADDRESSES=0xAddress3,0xAddress4

# Grant roles on Sepolia
npm run roles:sepolia

# Grant roles on Mainnet
npm run roles:mainnet
```

## 📝 Available NPM Scripts

### Compilation
- `npm run compile` - Compile contracts
- `npm run clean` - Clean artifacts
- `npm run size` - Check contract sizes

### Testing
- `npm test` - Run all tests
- `npm run test:gas` - Run with gas reporting
- `npm run test:gas:file` - Save gas report to file
- `npm run test:coverage` - Generate coverage report
- `npm run test:parallel` - Run tests in parallel

### Deployment
- `npm run deploy:local` - Deploy to localhost
- `npm run deploy:sepolia` - Deploy to Sepolia
- `npm run deploy:mainnet` - Deploy to Mainnet
- `npm run deploy:polygon` - Deploy to Polygon
- `npm run deploy:mumbai` - Deploy to Mumbai

### Verification
- `npm run verify` - Verify contracts
- `npm run verify:sepolia` - Verify on Sepolia
- `npm run verify:mainnet` - Verify on Mainnet
- `npm run verify:polygon` - Verify on Polygon

### Upgrades
- `npm run upgrade` - Upgrade contracts
- `npm run upgrade:sepolia` - Upgrade on Sepolia
- `npm run upgrade:mainnet` - Upgrade on Mainnet

### Role Management
- `npm run roles` - Grant roles
- `npm run roles:sepolia` - Grant roles on Sepolia
- `npm run roles:mainnet` - Grant roles on Mainnet

## 🔒 Security Best Practices

### Before Deployment

- [ ] All tests passing
- [ ] Coverage >90%
- [ ] Gas optimized
- [ ] Contract sizes under limit
- [ ] Access controls verified
- [ ] Reentrancy guards in place
- [ ] Integer overflow checks
- [ ] Emergency pause tested
- [ ] Upgrade mechanism tested

### Production Checklist

- [ ] Code audited (recommended)
- [ ] Testnet deployment successful
- [ ] Contracts verified on Etherscan
- [ ] Multi-sig for admin functions
- [ ] Private keys secured (hardware wallet)
- [ ] Monitoring setup
- [ ] Emergency procedures documented

## 📈 Monitoring

### Events to Monitor

```solidity
// NFT Contract
Transfer(address from, address to, uint256 tokenId)
RoleGranted(bytes32 role, address account, address sender)
Paused(address account)
Upgraded(address implementation)

// Marketplace
ListingCreated(uint256 listingId, address nftContract, uint256 tokenId, address seller, uint256 price)
ListingPurchased(uint256 listingId, address buyer, uint256 price)
AuctionCreated(uint256 auctionId, address nftContract, uint256 tokenId, address seller, uint256 startingBid)
BidPlaced(uint256 auctionId, address bidder, uint256 amount)
```

### Recommended Tools

- **Etherscan** - Transaction monitoring
- **Tenderly** - Debugging and alerts
- **OpenZeppelin Defender** - Automation and monitoring
- **Dune Analytics** - Custom dashboards
- **The Graph** - Indexing and queries

## 🐛 Troubleshooting

### Tests Failing

```bash
# Clean and recompile
npm run clean
npm run compile
npm test
```

### Deployment Fails

- Check deployer has sufficient ETH
- Verify RPC endpoint is working
- Check gas price settings
- Ensure contract size is under limit

### Verification Fails

- Wait 1-2 minutes after deployment
- Check API key is valid
- Verify constructor arguments
- Try manual verification on Etherscan

### Upgrade Fails

- Ensure deployer has admin role
- Check storage layout compatibility
- Test on testnet first
- Verify new implementation compiles

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [OpenZeppelin Upgrades](https://docs.openzeppelin.com/upgrades-plugins)
- [Etherscan Verification](https://hardhat.org/plugins/nomiclabs-hardhat-etherscan)
- [Gas Optimization](https://github.com/iskdrews/awesome-solidity-gas-optimization)

## 📄 License

MIT

---

**Need Help?**

1. Check `DEPLOYMENT.md` for detailed deployment guide
2. Review test files for usage examples
3. Check deployment logs in `deployments/` folder
4. Review transactions on block explorer

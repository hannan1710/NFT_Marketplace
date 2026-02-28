# 🚀 Quick Start - NFT Marketplace

Get your NFT Marketplace running in 5 minutes!

## Prerequisites

- Node.js v18+ ([Download](https://nodejs.org/))
- Python 3.8+ ([Download](https://python.org/))
- MetaMask ([Install](https://metamask.io/))

## Installation

```bash
# 1. Clone
git clone https://github.com/hannan1710/NFT_Marketplace.git
cd NFT_Marketplace

# 2. Verify setup
npm run verify

# 3. Install dependencies
npm run install:all

# 4. Install Python dependencies (optional - for AI features)
cd nft-fraud-detector && pip install -r requirements.txt && cd ..
cd nft-price-predictor && pip install -r requirements.txt && cd ..
```

## Run

```bash
# Start all services (opens multiple terminal windows)
npm start
```

Wait 10 seconds, then in a new terminal:

```bash
# Deploy contracts
npm run deploy

# Grant permissions
npx hardhat run scripts/grantAllRoles.js --network localhost
```

## Access

Open http://localhost:3000 and connect MetaMask!

## Services Running

- Frontend: http://localhost:3000
- Blockchain: http://127.0.0.1:8545
- Trust Score: http://localhost:4000
- Event Orchestrator: http://localhost:5000
- Fraud Detector: http://localhost:8000
- Price Predictor: http://localhost:8001

## Test It

```bash
# Mint a test NFT
npx hardhat run scripts/mintNFT.js --network localhost

# Create marketplace listings
npx hardhat run scripts/createTestListings.js --network localhost
```

## Troubleshooting

**Port in use?**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

**MetaMask issues?**
- Add Hardhat network: Chain ID `31337`, RPC `http://127.0.0.1:8545`
- Import test account from Hardhat terminal output

**Need help?** See [SETUP_GUIDE.md](./SETUP_GUIDE.md)

## Features

✅ Real-time blockchain monitoring
✅ AI fraud detection
✅ ML price prediction
✅ Trust scoring
✅ Lazy minting (EIP-712)
✅ Dark mode
✅ Responsive design

---

**Full documentation:** [README.md](./README.md)

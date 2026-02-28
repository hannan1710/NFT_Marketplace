# NFT Marketplace - Complete Setup Guide

This guide will help you set up and run the NFT Marketplace on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Python** 3.8 or higher ([Download](https://www.python.org/downloads/))
- **pip** (comes with Python)
- **Git** ([Download](https://git-scm.com/downloads))
- **MetaMask** browser extension ([Install](https://metamask.io/download/))

### Verify Prerequisites

```bash
node --version    # Should be v18 or higher
npm --version     # Should be 8 or higher
python --version  # Should be 3.8 or higher
pip --version     # Should be installed
git --version     # Should be installed
```

## Quick Start (Recommended)

### 1. Clone the Repository

```bash
git clone https://github.com/hannan1710/NFT_Marketplace.git
cd NFT_Marketplace
```

### 2. Install All Dependencies

```bash
npm run install:all
```

This will install dependencies for:
- Root project (Hardhat & smart contracts)
- Frontend (Next.js)
- Trust Score Service (Node.js)
- Event Orchestrator (Node.js)
- Validator Service (Node.js)
- Fraud Detector (Python)
- Price Predictor (Python)

### 3. Configure Environment Variables

The `.env` and `.env.local` files are already configured for local development. No changes needed!

### 4. Start Everything

```bash
npm start
```

This will open multiple terminal windows:
1. Hardhat Blockchain (localhost:8545)
2. Trust Score Service (localhost:4000)
3. Event Orchestrator (localhost:5000)
4. Fraud Detector (localhost:8000)
5. Price Predictor (localhost:8001)
6. Frontend (localhost:3000)

### 5. Deploy Smart Contracts

Wait 10 seconds for the blockchain to start, then in a new terminal:

```bash
npm run deploy
```

This will deploy the NFT and Marketplace contracts to your local blockchain.

### 6. Grant Roles (Important!)

```bash
npx hardhat run scripts/grantAllRoles.js --network localhost
```

This grants ADMIN_ROLE and MINTER_ROLE to your wallet.

### 7. Open the Application

Open your browser and go to: **http://localhost:3000**

### 8. Connect MetaMask

1. Click "Connect Wallet" button
2. Select MetaMask
3. If prompted, add the Hardhat network:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`
4. Import a test account from Hardhat (see terminal for private keys)

### 9. Test the Application

Create a test NFT:

```bash
npx hardhat run scripts/mintNFT.js --network localhost
```

Create test marketplace listings:

```bash
npx hardhat run scripts/createTestListings.js --network localhost
```

## Manual Setup (Alternative)

If you prefer to start services individually:

### Terminal 1 - Blockchain

```bash
npx hardhat node
```

Keep this running. You'll see test accounts with private keys.

### Terminal 2 - Deploy Contracts

Wait 5 seconds after starting the blockchain, then:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Copy the contract addresses that are displayed.

### Terminal 3 - Trust Score Service

```bash
cd trust-score-service
npm install
npm start
```

### Terminal 4 - Event Orchestrator

```bash
cd event-orchestrator-service
npm install
npm start
```

### Terminal 5 - Fraud Detector

```bash
cd nft-fraud-detector
pip install -r requirements.txt
python src/api/main.py
```

### Terminal 6 - Price Predictor

```bash
cd nft-price-predictor
pip install -r requirements.txt
python src/api/main.py
```

### Terminal 7 - Frontend

```bash
cd nft-marketplace-frontend
npm install
npm run dev
```

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

**Windows:**
```bash
# Find process using port (e.g., 3000)
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <PID_NUMBER> /F
```

**Mac/Linux:**
```bash
# Find and kill process using port
lsof -ti:3000 | xargs kill -9
```

### MetaMask Connection Issues

1. **Wrong Network**: Make sure MetaMask is on "Hardhat Local" (Chain ID: 31337)
2. **Reset Account**: Settings → Advanced → Reset Account
3. **Clear Cache**: Clear browser cache and reload

### Contract Not Deployed

If you see "Contract not found" errors:

```bash
# Redeploy contracts
npx hardhat run scripts/deploy.js --network localhost

# Grant roles again
npx hardhat run scripts/grantAllRoles.js --network localhost
```

### Python Services Won't Start

Make sure Python dependencies are installed:

```bash
cd nft-fraud-detector
pip install -r requirements.txt

cd ../nft-price-predictor
pip install -r requirements.txt
```

### Frontend Build Errors

```bash
cd nft-marketplace-frontend
rm -rf .next node_modules
npm install
npm run dev
```

### Services Won't Start on Windows

If `npm start` doesn't open terminal windows:

1. Use PowerShell (not CMD)
2. Or start services manually (see Manual Setup above)

## Testing

### Run Smart Contract Tests

```bash
npm test
```

### Run with Coverage

```bash
npm run test:coverage
```

### Run with Gas Reporting

```bash
npm run test:gas
```

## Project Structure

```
NFT_Marketplace/
├── contracts/                      # Smart contracts
│   ├── NFTContract.sol
│   └── NFTMarketplace.sol
├── scripts/                        # Deployment & utility scripts
│   ├── deploy.js
│   ├── grantAllRoles.js
│   ├── mintNFT.js
│   └── createTestListings.js
├── test/                          # Contract tests
├── nft-marketplace-frontend/      # Next.js frontend
├── trust-score-service/           # Trust scoring API
├── event-orchestrator-service/    # Event listener
├── nft-fraud-detector/            # Fraud detection API
├── nft-price-predictor/           # Price prediction API
├── validator-service/             # Contract validation
├── .env.example                   # Environment template
└── package.json                   # Root dependencies
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start all services |
| `npm run install:all` | Install all dependencies |
| `npm run deploy` | Deploy contracts to localhost |
| `npm test` | Run contract tests |
| `npm run test:coverage` | Run tests with coverage |
| `npm run start:backend` | Start only backend services |

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Trust Score | 4000 | http://localhost:4000 |
| Event Orchestrator | 5000 | http://localhost:5000 |
| Fraud Detector | 8000 | http://localhost:8000 |
| Price Predictor | 8001 | http://localhost:8001 |
| Hardhat Node | 8545 | http://127.0.0.1:8545 |

## Features

- ✅ Real-time blockchain event monitoring
- ✅ AI-powered fraud detection
- ✅ ML-based price prediction
- ✅ Dynamic trust scoring
- ✅ Lazy minting (EIP-712)
- ✅ UUPS upgradeable contracts
- ✅ Role-based access control
- ✅ ERC-2981 royalty standard
- ✅ Dark mode support
- ✅ Responsive design

## Next Steps

1. Explore the dashboard at http://localhost:3000
2. Create your first NFT using the "Create NFT" page
3. List NFTs on the marketplace
4. View real-time updates as transactions occur
5. Check trust scores and fraud detection results

## Support

- Check this guide for common issues
- Review the main [README.md](./README.md)
- Open an issue on GitHub

## Important Notes

- This is a local development setup
- Use test accounts from Hardhat (never use real private keys)
- All data is stored locally and will be lost when you stop the blockchain
- For production deployment, see the main README.md

---

**Happy Building! 🚀**

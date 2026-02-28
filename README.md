# AI-Driven NFT Marketplace

A production-grade NFT marketplace with AI-powered fraud detection, price prediction, trust scoring, and real-time blockchain event monitoring.

## 🌟 Features

### Smart Contracts
- ✅ ERC-721 NFT with lazy minting (EIP-712)
- ✅ UUPS upgradeable pattern
- ✅ Role-based access control
- ✅ ERC-2981 royalty standard
- ✅ Gas-optimized operations
- ✅ Marketplace with fixed price listings & auctions

### Frontend
- ✅ Real-time blockchain event monitoring
- ✅ Live dashboard with instant updates
- ✅ MetaMask & Coinbase Wallet integration
- ✅ Dark mode support
- ✅ Responsive design
- ✅ AI-powered analytics display

### Backend Services
- ✅ **Trust Score Service** - Dynamic wallet reputation scoring
- ✅ **Event Orchestrator** - Blockchain event listener & processor
- ✅ **Fraud Detector** - AI-powered fraud detection
- ✅ **Price Predictor** - ML-based NFT price prediction
- ✅ **Validator Service** - Smart contract security analysis

## 🚀 Quick Start

### Prerequisites

- Node.js v18+ and npm
- Python 3.8+
- Git
- MetaMask browser extension

### Setup Steps

```bash
# 1. Clone the repository
git clone https://github.com/hannan1710/NFT_Marketplace.git
cd NFT_Marketplace

# 2. Verify your setup
npm run verify

# 3. Install all dependencies
npm run install:all

# 4. Start everything (blockchain + backend + frontend)
npm start

# 5. Wait 10 seconds, then deploy contracts (in a new terminal)
npm run deploy

# 6. Grant roles to your wallet
npx hardhat run scripts/grantAllRoles.js --network localhost

# 7. Open http://localhost:3000 and connect MetaMask
```

That's it! Your NFT Marketplace is now running locally.

**Need more details?** See the complete [SETUP_GUIDE.md](./SETUP_GUIDE.md) for troubleshooting and manual setup instructions.

### Manual Setup

#### 1. Install Dependencies

```bash
# Root dependencies (Hardhat, contracts)
npm install

# Frontend dependencies
cd nft-marketplace-frontend
npm install
cd ..

# Backend services
cd trust-score-service && npm install && cd ..
cd event-orchestrator-service && npm install && cd ..
cd nft-fraud-detector && pip install -r requirements.txt && cd ..
cd nft-price-predictor && pip install -r requirements.txt && cd ..
```

#### 2. Configure Environment

```bash
# Copy environment files
cp .env.example .env
cp nft-marketplace-frontend/.env.example nft-marketplace-frontend/.env.local
```

#### 3. Start Services

**Terminal 1 - Blockchain:**
```bash
npx hardhat node
```

**Terminal 2 - Deploy Contracts:**
```bash
npx hardhat run scripts/deploy.js --network localhost
```

**Terminal 3 - Backend Services:**
```bash
npm run start:backend
```

**Terminal 4 - Frontend:**
```bash
cd nft-marketplace-frontend
npm run dev
```

## 📁 Project Structure

```
nft-marketplace/
├── contracts/                      # Smart contracts
│   ├── NFTContract.sol            # ERC-721 with lazy minting
│   └── NFTMarketplace.sol         # Marketplace contract
├── scripts/                        # Deployment & utility scripts
├── test/                          # Contract tests
├── nft-marketplace-frontend/      # Next.js frontend
│   ├── src/
│   │   ├── app/                   # Pages
│   │   ├── components/            # React components
│   │   ├── hooks/                 # Custom hooks (real-time)
│   │   ├── config/                # Configuration
│   │   └── lib/                   # Utilities
├── trust-score-service/           # Node.js trust scoring
├── event-orchestrator-service/    # Event listener & processor
├── nft-fraud-detector/            # Python fraud detection
├── nft-price-predictor/           # Python price prediction
└── validator-service/             # Contract validation

```

## 🔧 Configuration

### Frontend (.env.local)

```env
# Contract Addresses (auto-updated after deployment)
NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=0x...

# Backend Services
NEXT_PUBLIC_TRUST_SCORE_API_URL=http://localhost:4000
NEXT_PUBLIC_EVENT_ORCHESTRATOR_API_URL=http://localhost:5000
NEXT_PUBLIC_FRAUD_DETECTOR_API_URL=http://localhost:8000
NEXT_PUBLIC_PRICE_PREDICTOR_API_URL=http://localhost:8001
```

### Backend Services

Each service has its own `.env` file. Copy from `.env.example` in each directory.

## 🧪 Testing

### Smart Contracts

```bash
# Run all tests
npm test

# Run specific test
npx hardhat test test/NFTContract.test.js

# Coverage
npm run coverage
```

### Frontend

```bash
cd nft-marketplace-frontend
npm run build
```

### Backend Services

```bash
# Trust Score Service
cd trust-score-service
npm test

# Fraud Detector
cd nft-fraud-detector
pytest
```

## 📊 Available Scripts

### Root Package.json

```bash
npm run verify         # Verify setup is complete
npm start              # Start everything (blockchain + backend + frontend)
npm run install:all    # Install all dependencies
npm run start:backend  # Start all backend services
npm test              # Run contract tests
npm run deploy        # Deploy contracts to localhost
```

### Frontend

```bash
npm run dev           # Development server
npm run build         # Production build
npm start            # Production server
```

## 🌐 Service Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Trust Score | 4000 | http://localhost:4000 |
| Event Orchestrator | 5000 | http://localhost:5000 |
| Fraud Detector | 8000 | http://localhost:8000 |
| Price Predictor | 8001 | http://localhost:8001 |
| Hardhat Node | 8545 | http://127.0.0.1:8545 |

## 🎯 Usage

### 1. Connect Wallet

1. Open http://localhost:3000
2. Click "Connect Wallet"
3. Select MetaMask
4. Approve connection

### 2. Mint NFT

```bash
npx hardhat run scripts/lazyMintExample.js --network localhost
```

Watch your dashboard update in real-time!

### 3. Create Marketplace Listing

```bash
npx hardhat run scripts/createTestListings.js --network localhost
```

### 4. Explore Features

- **Dashboard**: Real-time stats, trust score, fraud detection
- **Marketplace**: Browse and purchase NFTs
- **NFT Details**: View metadata, price predictions, trust scores

## 🔐 Security Features

- ✅ ReentrancyGuard on all state-changing functions
- ✅ Access control with role-based permissions
- ✅ Pausable contracts for emergency stops
- ✅ UUPS upgradeable pattern
- ✅ EIP-712 signature verification for lazy minting
- ✅ Nonce tracking to prevent replay attacks
- ✅ AI-powered fraud detection
- ✅ Contract validation service

## 🤖 AI Features

### Trust Score System
- Transaction history analysis
- Dispute tracking
- Account age verification
- Fraud risk assessment
- Behavioral consistency monitoring

### Fraud Detection
- Anomaly detection (Isolation Forest)
- Pattern recognition (wash trading, circular transfers)
- Graph analysis (wallet relationships)
- Real-time risk scoring

### Price Prediction
- Random Forest & Linear Regression models
- Rarity score analysis
- Creator volume tracking
- Demand index calculation
- Confidence scoring

## 📱 Real-Time Features

The dashboard updates automatically when:
- NFTs are minted or transferred
- Listings are created or purchased
- Auctions are created or finalized
- Trust scores change
- Fraud is detected

**No manual refresh needed!**

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check if ports are in use
netstat -ano | findstr "3000 4000 5000 8000 8001 8545"

# Kill processes if needed
taskkill /PID <pid> /F
```

### MetaMask Connection Issues

1. Ensure MetaMask is on localhost network (Chain ID: 31337)
2. Reset account in MetaMask settings
3. Clear browser cache

### Contract Deployment Fails

```bash
# Clean and redeploy
npx hardhat clean
rm -rf artifacts cache
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
```

### Frontend Build Errors

```bash
cd nft-marketplace-frontend
rm -rf .next node_modules
npm install
npm run build
```

## 📚 Documentation

- [Smart Contracts](./contracts/README.md)
- [Frontend Setup](./nft-marketplace-frontend/README.md)
- [Trust Score Service](./trust-score-service/README.md)
- [Event Orchestrator](./event-orchestrator-service/README.md)
- [Fraud Detector](./nft-fraud-detector/README.md)
- [Price Predictor](./nft-price-predictor/README.md)

## 🚢 Deployment

### Testnet (Sepolia)

```bash
# Configure .env with Sepolia RPC and private key
npx hardhat run scripts/deployments/deploy-sepolia.js --network sepolia

# Verify contracts
npx hardhat run scripts/verification/verify-sepolia.js --network sepolia
```

### Mainnet

```bash
# Configure .env with Mainnet RPC and private key
npx hardhat run scripts/deployments/deploy-mainnet.js --network mainnet

# Verify contracts
npx hardhat run scripts/verification/verify-mainnet.js --network mainnet
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenZeppelin for secure contract libraries
- Hardhat for development environment
- Next.js for frontend framework
- Wagmi for Web3 React hooks
- FastAPI for Python backend services

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check [Troubleshooting](#-troubleshooting) section
- Review documentation in `/docs`

## 🎓 Learn More

- [Hardhat Documentation](https://hardhat.org/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Wagmi Documentation](https://wagmi.sh)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)

---

**Built with ❤️ for the Web3 community**

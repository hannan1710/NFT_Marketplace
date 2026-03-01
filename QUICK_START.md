# Quick Start - NFT Marketplace

## Prerequisites

- Node.js (v18 or higher)
- Python (v3.8 or higher)
- MongoDB (optional - will warn if not installed)
- PowerShell (Windows) or Bash (Linux/Mac)

## Start Everything (One Command)

### For Windows (PowerShell - Recommended):
```powershell
.\start-dev.ps1
```

### For Windows (CMD):
```bash
start-dev.bat
```

This will automatically:
1. ✅ Start MongoDB (if installed)
2. ✅ Start Hardhat blockchain node
3. ✅ Deploy NFT contract
4. ✅ Deploy Marketplace contract
5. ✅ Update frontend with new contract addresses
6. ✅ Fund your wallet with 100 test ETH
7. ✅ Grant ADMIN & MINTER roles to your wallet
8. ✅ Start Trust Score Service (port 4000)
9. ✅ Start Event Orchestrator (port 5000)
10. ✅ Start Validator Service (port 3002)
11. ✅ Start Fraud Detector (port 8000)
12. ✅ Start Price Predictor (port 8001)
13. ✅ Start Frontend (port 3000)

**Result:** 7 new windows will open (1 for Hardhat + 6 for services)

## Stop Everything

### For Windows (PowerShell - Recommended):
```powershell
.\stop-dev.ps1
```

### For Windows (CMD):
```bash
stop-dev.bat
```

This will:
- ✅ Stop all Node.js processes
- ✅ Stop all Python processes
- ✅ Stop MongoDB
- ✅ Close all service windows
- ✅ Auto-close the terminal after 2 seconds

## Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main NFT Marketplace UI |
| **Hardhat Node** | http://localhost:8545 | Local blockchain |
| **Trust Score** | http://localhost:4000 | Wallet reputation service |
| **Event Orchestrator** | http://localhost:5000 | Event processing hub |
| **Validator** | http://localhost:3002 | Contract validation |
| **Fraud Detector** | http://localhost:8000 | AI fraud detection |
| **Price Predictor** | http://localhost:8001 | AI price prediction |
| **MongoDB** | mongodb://localhost:27017 | Database |

## MetaMask Setup

1. **Add Localhost Network:**
   - Network Name: `Localhost 8545`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

2. **Your Default Wallet Address:**
   ```
   0xE7c2BA1d96EA2a1c52e3d2e7c2aeFC3fbB822535
   ```
   This wallet is automatically funded with 100 ETH and granted all necessary roles.

3. **Import Account (Optional):**
   - Use one of the private keys shown in the Hardhat Node window
   - MetaMask → Import Account → Paste private key

## Verify Setup

Run this command to check if everything is working:
```bash
npx hardhat run scripts/checkSetup.js --network localhost
```

This will verify:
- ✅ Contracts are deployed
- ✅ Your wallet has ETH
- ✅ You have MINTER_ROLE
- ✅ All services are responding

## Troubleshooting

### MongoDB Warning
If you see "MongoDB not found", you can:
- Install it: `winget install MongoDB.Server`
- Or ignore it if using Docker for MongoDB

### Services Won't Start
1. Stop everything: `.\stop-dev.ps1`
2. Wait 5 seconds
3. Start again: `.\start-dev.ps1`

### MetaMask Shows "Review Alert"
This means you need to grant roles. The start script does this automatically, but if needed:
```bash
npx hardhat run scripts/grantAllRoles.js --network localhost
```

### Port Already in Use
If a port is busy:
1. Stop all services: `.\stop-dev.ps1`
2. Check what's using the port: `netstat -ano | findstr :3000`
3. Kill the process or change the port in the service

### Need Different Wallet Address
Edit these files with your address:
- `scripts/grantAllRoles.js`
- `scripts/fundWallet.js`

### Python Virtual Environment Issues
If Python services fail:
```bash
# Create virtual environments
cd nft-fraud-detector
python -m venv venv

cd ../nft-price-predictor
python -m venv venv

# Install dependencies
cd nft-fraud-detector
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt

cd ../nft-price-predictor
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Quick Commands Reference

| Task | Command |
|------|---------|
| Start all services | `.\start-dev.ps1` |
| Stop all services | `.\stop-dev.ps1` |
| Check setup | `npx hardhat run scripts/checkSetup.js --network localhost` |
| Fund wallet | `npx hardhat run scripts/fundWallet.js --network localhost` |
| Grant roles | `npx hardhat run scripts/grantAllRoles.js --network localhost` |
| Run tests | `npx hardhat test` |
| Clean build | `npx hardhat clean` |

## Development Workflow

1. **First Time Setup:**
   ```powershell
   npm install
   .\start-dev.ps1
   ```

2. **Daily Development:**
   ```powershell
   .\start-dev.ps1
   # Do your work
   .\stop-dev.ps1
   ```

3. **After Code Changes:**
   - Frontend: Auto-reloads (no restart needed)
   - Smart Contracts: Restart with `.\start-dev.ps1`
   - Backend Services: Restart with `.\start-dev.ps1`

## That's It!

Just run `.\start-dev.ps1` and open http://localhost:3000 in your browser! 🚀

The script handles everything automatically - from blockchain setup to service deployment.


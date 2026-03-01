# Quick Start - NFT Marketplace

## Start Everything (One Command)

```bash
start-dev.bat
```

This will open 8 windows and automatically:
1. ✅ Start MongoDB
2. ✅ Start Hardhat blockchain
3. ✅ Deploy NFT contract
4. ✅ Deploy Marketplace contract
5. ✅ Update frontend with new addresses
6. ✅ Fund your wallet (100 ETH)
7. ✅ Grant MINTER_ROLE to your wallet
8. ✅ Start all backend services
9. ✅ Start frontend

## Stop Everything

```bash
stop-dev.bat
```

Stops all Node.js, Python, and MongoDB processes.

## Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Hardhat Node | http://localhost:8545 |
| Trust Score | http://localhost:4000 |
| Event Orchestrator | http://localhost:5000 |
| Validator | http://localhost:3002 |
| Fraud Detector | http://localhost:8000 |
| Price Predictor | http://localhost:8001 |
| MongoDB | mongodb://localhost:27017 |

## MetaMask Setup

1. Add Network:
   - Name: `Localhost 8545`
   - RPC: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Symbol: `ETH`

2. Your wallet address should be:
   ```
   0xE7c2BA1d96EA2a1c52e3d2e7c2aeFC3fbB822535
   ```

## Troubleshooting

### MetaMask shows "Review alert"

Run this to check everything:
```bash
npx hardhat run scripts/checkSetup.js --network localhost
```

It will tell you exactly what's wrong and how to fix it.

### Services won't start

1. Stop everything: `stop-dev.bat`
2. Wait 5 seconds
3. Start again: `start-dev.bat`

### Need to change wallet address

Edit `scripts/grantAllRoles.js` and `scripts/fundWallet.js` with your address.

## That's It!

Just run `start-dev.bat` and open http://localhost:3000 in your browser.

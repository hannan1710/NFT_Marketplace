#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('╔════════════════════════════════════════════╗');
console.log('║   NFT Marketplace - Starting Everything   ║');
console.log('╚════════════════════════════════════════════╝\n');

const isWindows = process.platform === 'win32';
const shell = isWindows ? 'powershell.exe' : 'bash';

// Function to start a service in a new terminal
function startService(name, command, cwd = '.') {
  console.log(`Starting ${name}...`);
  
  const fullPath = path.resolve(cwd);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  ${name} directory not found: ${fullPath}`);
    return null;
  }

  let proc;
  
  if (isWindows) {
    // Windows: Start in new PowerShell window
    proc = spawn('powershell.exe', [
      '-NoExit',
      '-Command',
      `cd '${fullPath}'; Write-Host '${name}' -ForegroundColor Yellow; ${command}`
    ], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
      shell: false
    });
  } else {
    // Linux/Mac: Start in new terminal
    const terminalCommands = {
      darwin: ['osascript', '-e', `tell app "Terminal" to do script "cd ${fullPath} && ${command}"`],
      linux: ['gnome-terminal', '--', 'bash', '-c', `cd ${fullPath} && ${command}; exec bash`]
    };
    
    const [cmd, ...args] = terminalCommands[process.platform] || terminalCommands.linux;
    proc = spawn(cmd, args, {
      detached: true,
      stdio: 'ignore'
    });
  }
  
  if (proc) {
    proc.unref();
    console.log(`✓ ${name} started\n`);
  }
  
  return proc;
}

// Wait function
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main execution
async function main() {
  console.log('[1/3] Starting Hardhat Blockchain...');
  startService('Hardhat Blockchain', 'npx hardhat node', '.');
  await wait(3000);

  console.log('[2/3] Starting Backend Services...');
  
  // Trust Score Service
  startService('Trust Score Service', 'npm start', 'trust-score-service');
  await wait(1000);
  
  // Event Orchestrator
  startService('Event Orchestrator', 'npm start', 'event-orchestrator-service');
  await wait(1000);
  
  // Fraud Detector (Python)
  startService('Fraud Detector', 'python src/api/main.py', 'nft-fraud-detector');
  await wait(1000);
  
  // Price Predictor (Python)
  startService('Price Predictor', 'python src/api/main.py', 'nft-price-predictor');
  await wait(1000);

  console.log('[3/3] Starting Frontend...');
  startService('Frontend', 'npm run dev', 'nft-marketplace-frontend');

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║          All Services Started! ✓           ║');
  console.log('╚════════════════════════════════════════════╝\n');

  console.log('📍 Access Points:');
  console.log('   Frontend:           http://localhost:3000');
  console.log('   Blockchain:         http://127.0.0.1:8545');
  console.log('   Trust Score:        http://localhost:4000');
  console.log('   Event Orchestrator: http://localhost:5000');
  console.log('   Fraud Detector:     http://localhost:8000');
  console.log('   Price Predictor:    http://localhost:8001\n');

  console.log('⚠️  Next Steps:');
  console.log('   1. Wait 10 seconds for all services to start');
  console.log('   2. Deploy contracts: npm run deploy');
  console.log('   3. Open http://localhost:3000 in your browser');
  console.log('   4. Connect MetaMask wallet\n');

  console.log('💡 Tip: Close all terminal windows to stop all services\n');
}

main().catch(console.error);

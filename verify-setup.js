#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('╔════════════════════════════════════════════╗');
console.log('║   NFT Marketplace - Setup Verification    ║');
console.log('╚════════════════════════════════════════════╝\n');

let allGood = true;

// Check functions
function checkCommand(command, name, minVersion = null) {
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    const version = output.trim().split('\n')[0];
    console.log(`✓ ${name}: ${version}`);
    return true;
  } catch (error) {
    console.log(`✗ ${name}: NOT FOUND`);
    allGood = false;
    return false;
  }
}

function checkFile(filePath, name) {
  if (fs.existsSync(filePath)) {
    console.log(`✓ ${name}: Found`);
    return true;
  } else {
    console.log(`✗ ${name}: NOT FOUND`);
    allGood = false;
    return false;
  }
}

function checkDirectory(dirPath, name) {
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    const hasNodeModules = fs.existsSync(path.join(dirPath, 'node_modules'));
    if (hasNodeModules) {
      console.log(`✓ ${name}: Installed`);
      return true;
    } else {
      console.log(`⚠ ${name}: Dependencies not installed`);
      allGood = false;
      return false;
    }
  } else {
    console.log(`✗ ${name}: Directory not found`);
    allGood = false;
    return false;
  }
}

// 1. Check Prerequisites
console.log('1. Checking Prerequisites...\n');
checkCommand('node --version', 'Node.js');
checkCommand('npm --version', 'npm');
checkCommand('python --version', 'Python');
checkCommand('pip --version', 'pip');
checkCommand('git --version', 'Git');

// 2. Check Project Structure
console.log('\n2. Checking Project Structure...\n');
checkFile('package.json', 'Root package.json');
checkFile('.env.example', 'Environment template');
checkFile('hardhat.config.js', 'Hardhat config');

// Just check if directories exist (not node_modules)
if (fs.existsSync('contracts') && fs.statSync('contracts').isDirectory()) {
  console.log('✓ Smart contracts: Found');
} else {
  console.log('✗ Smart contracts: NOT FOUND');
  allGood = false;
}

if (fs.existsSync('scripts') && fs.statSync('scripts').isDirectory()) {
  console.log('✓ Deployment scripts: Found');
} else {
  console.log('✗ Deployment scripts: NOT FOUND');
  allGood = false;
}

if (fs.existsSync('test') && fs.statSync('test').isDirectory()) {
  console.log('✓ Test files: Found');
} else {
  console.log('✗ Test files: NOT FOUND');
  allGood = false;
}

// 3. Check Services
console.log('\n3. Checking Services...\n');
checkDirectory('nft-marketplace-frontend', 'Frontend');
checkDirectory('trust-score-service', 'Trust Score Service');
checkDirectory('event-orchestrator-service', 'Event Orchestrator');
checkDirectory('validator-service', 'Validator Service');

// Python services - just check if they exist
if (fs.existsSync('nft-fraud-detector') && fs.existsSync('nft-fraud-detector/requirements.txt')) {
  console.log('✓ Fraud Detector: Found (Python dependencies need manual install)');
} else {
  console.log('✗ Fraud Detector: NOT FOUND');
  allGood = false;
}

if (fs.existsSync('nft-price-predictor') && fs.existsSync('nft-price-predictor/requirements.txt')) {
  console.log('✓ Price Predictor: Found (Python dependencies need manual install)');
} else {
  console.log('✗ Price Predictor: NOT FOUND');
  allGood = false;
}

// 4. Check Environment Files
console.log('\n4. Checking Environment Configuration...\n');
const hasEnv = checkFile('.env', 'Root .env');
const hasFrontendEnv = checkFile('nft-marketplace-frontend/.env.local', 'Frontend .env.local');

if (!hasEnv) {
  console.log('   → Run: cp .env.example .env');
}
if (!hasFrontendEnv) {
  console.log('   → Run: cp nft-marketplace-frontend/.env.example nft-marketplace-frontend/.env.local');
}

// 5. Check Dependencies
console.log('\n5. Checking Dependencies...\n');
const hasRootDeps = fs.existsSync('node_modules');
const hasFrontendDeps = fs.existsSync('nft-marketplace-frontend/node_modules');
const hasTrustScoreDeps = fs.existsSync('trust-score-service/node_modules');
const hasEventOrchestratorDeps = fs.existsSync('event-orchestrator-service/node_modules');
const hasValidatorDeps = fs.existsSync('validator-service/node_modules');

if (hasRootDeps) {
  console.log('✓ Root dependencies: Installed');
} else {
  console.log('✗ Root dependencies: NOT INSTALLED');
  console.log('   → Run: npm install');
  allGood = false;
}

if (hasFrontendDeps) {
  console.log('✓ Frontend dependencies: Installed');
} else {
  console.log('✗ Frontend dependencies: NOT INSTALLED');
  console.log('   → Run: cd nft-marketplace-frontend && npm install');
  allGood = false;
}

if (hasTrustScoreDeps) {
  console.log('✓ Trust Score dependencies: Installed');
} else {
  console.log('✗ Trust Score dependencies: NOT INSTALLED');
  console.log('   → Run: cd trust-score-service && npm install');
  allGood = false;
}

if (hasEventOrchestratorDeps) {
  console.log('✓ Event Orchestrator dependencies: Installed');
} else {
  console.log('✗ Event Orchestrator dependencies: NOT INSTALLED');
  console.log('   → Run: cd event-orchestrator-service && npm install');
  allGood = false;
}

if (hasValidatorDeps) {
  console.log('✓ Validator dependencies: Installed');
} else {
  console.log('✗ Validator dependencies: NOT INSTALLED');
  console.log('   → Run: cd validator-service && npm install');
  allGood = false;
}

// 6. Summary
console.log('\n╔════════════════════════════════════════════╗');
if (allGood) {
  console.log('║          ✓ Setup Complete!                ║');
  console.log('╚════════════════════════════════════════════╝\n');
  console.log('⚠️  Note: Python services require manual dependency installation:');
  console.log('   cd nft-fraud-detector && pip install -r requirements.txt');
  console.log('   cd nft-price-predictor && pip install -r requirements.txt\n');
  console.log('Next Steps:');
  console.log('1. Run: npm start');
  console.log('2. Wait 10 seconds for services to start');
  console.log('3. Run: npm run deploy');
  console.log('4. Run: npx hardhat run scripts/grantAllRoles.js --network localhost');
  console.log('5. Open: http://localhost:3000\n');
} else {
  console.log('║          ✗ Setup Incomplete               ║');
  console.log('╚════════════════════════════════════════════╝\n');
  console.log('Please fix the issues above, then run:');
  console.log('  npm run install:all\n');
  console.log('Or install dependencies manually as indicated.\n');
}

process.exit(allGood ? 0 : 1);

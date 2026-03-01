const fs = require('fs');
const path = require('path');

async function updateFrontendConfig() {
  try {
    // Read the latest deployment info
    const nftDeployment = JSON.parse(
      fs.readFileSync('deployments/localhost-latest.json', 'utf8')
    );
    const marketplaceDeployment = JSON.parse(
      fs.readFileSync('deployment-marketplace-localhost.json', 'utf8')
    );

    const nftAddress = nftDeployment.contracts.NFTContract.proxy;
    const marketplaceAddress = marketplaceDeployment.marketplace.proxy;

    console.log('\n📝 Updating frontend configuration...');
    console.log(`NFT Contract: ${nftAddress}`);
    console.log(`Marketplace Contract: ${marketplaceAddress}`);

    // Update .env.local
    const envPath = path.join(__dirname, '../nft-marketplace-frontend/.env.local');
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Replace contract addresses
    envContent = envContent.replace(
      /NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x[a-fA-F0-9]{40}/,
      `NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=${nftAddress}`
    );
    envContent = envContent.replace(
      /NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=0x[a-fA-F0-9]{40}/,
      `NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=${marketplaceAddress}`
    );

    fs.writeFileSync(envPath, envContent);
    console.log('✅ Frontend .env.local updated');

    // Update backend services
    const trustScoreEnvPath = path.join(__dirname, '../trust-score-service/.env');
    let trustScoreEnv = fs.readFileSync(trustScoreEnvPath, 'utf8');
    trustScoreEnv = trustScoreEnv.replace(
      /NFT_CONTRACT_ADDRESS=0x[a-fA-F0-9]{40}/,
      `NFT_CONTRACT_ADDRESS=${nftAddress}`
    );
    trustScoreEnv = trustScoreEnv.replace(
      /MARKETPLACE_CONTRACT_ADDRESS=0x[a-fA-F0-9]{40}/,
      `MARKETPLACE_CONTRACT_ADDRESS=${marketplaceAddress}`
    );
    fs.writeFileSync(trustScoreEnvPath, trustScoreEnv);
    console.log('✅ Trust Score Service .env updated');

    const orchestratorEnvPath = path.join(__dirname, '../event-orchestrator-service/.env');
    let orchestratorEnv = fs.readFileSync(orchestratorEnvPath, 'utf8');
    orchestratorEnv = orchestratorEnv.replace(
      /NFT_CONTRACT_ADDRESS=0x[a-fA-F0-9]{40}/,
      `NFT_CONTRACT_ADDRESS=${nftAddress}`
    );
    orchestratorEnv = orchestratorEnv.replace(
      /MARKETPLACE_CONTRACT_ADDRESS=0x[a-fA-F0-9]{40}/,
      `MARKETPLACE_CONTRACT_ADDRESS=${marketplaceAddress}`
    );
    fs.writeFileSync(orchestratorEnvPath, orchestratorEnv);
    console.log('✅ Event Orchestrator Service .env updated');

    console.log('\n✅ All configurations updated successfully!\n');
  } catch (error) {
    console.error('❌ Error updating frontend config:', error.message);
    process.exit(1);
  }
}

updateFrontendConfig();

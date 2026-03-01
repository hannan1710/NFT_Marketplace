// MongoDB initialization script
// This script runs when the MongoDB container is first created

db = db.getSiblingDB('nft_marketplace');

// Create collections
db.createCollection('trust_scores');
db.createCollection('events');
db.createCollection('nft_metadata');
db.createCollection('marketplace_listings');
db.createCollection('fraud_reports');
db.createCollection('price_predictions');

// Create indexes for trust_scores
db.trust_scores.createIndex({ "walletAddress": 1 }, { unique: true });
db.trust_scores.createIndex({ "score": -1 });
db.trust_scores.createIndex({ "lastUpdated": -1 });

// Create indexes for events
db.events.createIndex({ "eventType": 1 });
db.events.createIndex({ "blockNumber": -1 });
db.events.createIndex({ "timestamp": -1 });
db.events.createIndex({ "transactionHash": 1 });
db.events.createIndex({ "processed": 1 });

// Create indexes for nft_metadata
db.nft_metadata.createIndex({ "tokenId": 1 }, { unique: true });
db.nft_metadata.createIndex({ "owner": 1 });
db.nft_metadata.createIndex({ "creator": 1 });

// Create indexes for marketplace_listings
db.marketplace_listings.createIndex({ "tokenId": 1 });
db.marketplace_listings.createIndex({ "seller": 1 });
db.marketplace_listings.createIndex({ "status": 1 });
db.marketplace_listings.createIndex({ "listingType": 1 });
db.marketplace_listings.createIndex({ "endTime": 1 });

// Create indexes for fraud_reports
db.fraud_reports.createIndex({ "walletAddress": 1 });
db.fraud_reports.createIndex({ "tokenId": 1 });
db.fraud_reports.createIndex({ "riskScore": -1 });
db.fraud_reports.createIndex({ "timestamp": -1 });

// Create indexes for price_predictions
db.price_predictions.createIndex({ "tokenId": 1 });
db.price_predictions.createIndex({ "timestamp": -1 });
db.price_predictions.createIndex({ "confidence": -1 });

print('MongoDB initialization completed successfully');

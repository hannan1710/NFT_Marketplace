/**
 * Trust Score Routes
 */

const express = require('express');
const router = express.Router();
const trustScoreController = require('../controllers/trustScoreController');
const { validateWallet, validateTransaction, validateDispute } = require('../middleware/validation');

// Get trust score for wallet
router.get('/:wallet', validateWallet, trustScoreController.getTrustScore);

// Get detailed trust score
router.get('/:wallet/detailed', validateWallet, trustScoreController.getDetailedTrustScore);

// Add transaction
router.post('/:wallet/transaction', validateWallet, validateTransaction, trustScoreController.addTransaction);

// Add dispute
router.post('/:wallet/dispute', validateWallet, validateDispute, trustScoreController.addDispute);

// Check fraud
router.post('/:wallet/fraud-check', validateWallet, trustScoreController.checkFraud);

// Get top trusted wallets
router.get('/top', trustScoreController.getTopTrusted);

// Get blacklisted wallets
router.get('/blacklisted', trustScoreController.getBlacklisted);

// Blacklist wallet
router.post('/:wallet/blacklist', validateWallet, trustScoreController.blacklistWallet);

// Remove from blacklist
router.delete('/:wallet/blacklist', validateWallet, trustScoreController.removeFromBlacklist);

module.exports = router;

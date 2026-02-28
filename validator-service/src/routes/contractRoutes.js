const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');
const { validateContractInput } = require('../middleware/validation');

/**
 * @route   POST /api/analyze-contract
 * @desc    Analyze smart contract for vulnerabilities
 * @access  Public
 */
router.post('/analyze-contract', validateContractInput, contractController.analyzeContract);

/**
 * @route   GET /api/vulnerability-types
 * @desc    Get list of vulnerability types detected by the service
 * @access  Public
 */
router.get('/vulnerability-types', contractController.getVulnerabilityTypes);

/**
 * @route   GET /api/stats
 * @desc    Get service statistics
 * @access  Public
 */
router.get('/stats', contractController.getStats);

module.exports = router;

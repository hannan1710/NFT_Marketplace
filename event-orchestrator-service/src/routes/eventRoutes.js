/**
 * Event Routes
 */

const express = require('express');
const router = express.Router();
const NFTEvent = require('../models/NFTEvent');

// Get event by transaction hash
router.get('/transaction/:txHash', async (req, res) => {
  try {
    const events = await NFTEvent.findByTransaction(req.params.txHash);
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get events by token ID
router.get('/token/:tokenId', async (req, res) => {
  try {
    const events = await NFTEvent.findByToken(req.params.tokenId);
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get events by wallet
router.get('/wallet/:address', async (req, res) => {
  try {
    const events = await NFTEvent.findByWallet(req.params.address);
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get event statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await NFTEvent.getEventStats();
    const totalEvents = await NFTEvent.countDocuments();
    const processedEvents = await NFTEvent.countDocuments({ isFullyProcessed: true });
    const eventsWithErrors = await NFTEvent.countDocuments({ hasErrors: true });
    
    res.json({
      success: true,
      data: {
        total: totalEvents,
        processed: processedEvents,
        withErrors: eventsWithErrors,
        byType: stats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get unprocessed events
router.get('/unprocessed', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const events = await NFTEvent.getUnprocessedEvents(limit);
    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

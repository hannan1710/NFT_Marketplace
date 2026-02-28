/**
 * Validation Middleware
 */

const Joi = require('joi');

// Validate wallet address
exports.validateWallet = (req, res, next) => {
  const { wallet } = req.params;
  
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid wallet address format'
    });
  }
  
  next();
};

// Validate transaction data
exports.validateTransaction = (req, res, next) => {
  const schema = Joi.object({
    transactionHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
    type: Joi.string().valid('mint', 'transfer', 'sale', 'purchase', 'listing', 'bid').required(),
    amount: Joi.number().min(0).optional(),
    timestamp: Joi.date().optional()
  });
  
  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }
  
  next();
};

// Validate dispute data
exports.validateDispute = (req, res, next) => {
  const schema = Joi.object({
    disputeId: Joi.string().required(),
    type: Joi.string().valid('fraud', 'counterfeit', 'non-delivery', 'quality', 'other').required(),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
    status: Joi.string().valid('open', 'resolved', 'closed').optional()
  });
  
  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }
  
  next();
};

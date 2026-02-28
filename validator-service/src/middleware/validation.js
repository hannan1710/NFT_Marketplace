const Joi = require('joi');

/**
 * Validation schemas
 */
const contractAnalysisSchema = Joi.object({
  sourceCode: Joi.string()
    .required()
    .min(10)
    .max(1000000) // 1MB max
    .messages({
      'string.empty': 'Source code is required',
      'string.min': 'Source code must be at least 10 characters',
      'string.max': 'Source code must not exceed 1MB'
    }),
  contractName: Joi.string()
    .optional()
    .max(100)
    .default('Unknown')
    .messages({
      'string.max': 'Contract name must not exceed 100 characters'
    })
});

/**
 * Validate contract analysis input
 */
exports.validateContractInput = (req, res, next) => {
  const { error, value } = contractAnalysisSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  // Replace body with validated and sanitized data
  req.body = value;
  next();
};

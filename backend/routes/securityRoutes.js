const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');
const { verifyAuth } = require('../middleware/authMiddleware');

// Log security violation
router.post('/violations', securityController.logViolation);

// Get violations for a file
router.get('/violations/:fileId', verifyAuth, securityController.getViolations);

// Record access attempt
router.post('/access-attempts', securityController.recordAccessAttempt);



module.exports = router;

const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');
const { verifyAuth } = require('../middleware/authMiddleware');

// Log security violation
router.post('/violations', securityController.logViolation);



module.exports = router;

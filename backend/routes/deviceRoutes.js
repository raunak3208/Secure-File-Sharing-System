const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// Bind device on first access
router.post('/bind', deviceController.bindDevice);

// Check device binding
router.post('/check', deviceController.checkDevice);

// Get device history
router.get('/history/:fileAccessId', deviceController.getDeviceHistory);

module.exports = router;

const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// Bind device on first access
router.post('/bind', deviceController.bindDevice);



module.exports = router;

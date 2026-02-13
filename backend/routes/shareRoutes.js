const express = require('express');
const shareController = require('../controllers/shareController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', authenticateToken, shareController.createShare);

module.exports = router;

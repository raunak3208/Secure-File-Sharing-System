const express = require('express');
const fileController = require('../controllers/fileController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticateToken, fileController.getFiles);


module.exports = router;

const express = require('express');
const fileController = require('../controllers/fileController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticateToken, fileController.getFiles);
router.get('/:fileId', authenticateToken, fileController.getFileById);
router.delete('/:fileId', authenticateToken, fileController.deleteFile);

module.exports = router;

const express = require('express');
const shareController = require('../controllers/shareController');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', authenticateToken, shareController.createShare);
router.get('/file/:fileId', authenticateToken, shareController.getShares);
router.get('/token/:token', shareController.getShareByToken);
router.delete('/:shareId', authenticateToken, shareController.deleteShare);

module.exports = router;

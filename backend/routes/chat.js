const express = require('express');
const requireAuth = require('../middleware/auth');
const { getMessages, sendMessage } = require('../controllers/chatController');

const router = express.Router();
router.use(requireAuth);

router.get('/:id', getMessages);
router.post('/:id', sendMessage);

module.exports = router;

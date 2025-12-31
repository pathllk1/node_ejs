const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const verifyToken = require('../middleware/authMiddleware');

router.get('/dashboard', (req, res) => {
    res.render('ai-dashboard', { title: 'AI Sentiment Dashboard' });
});

router.get('/chat', (req, res) => {
    res.render('chat', { title: 'AI Chat Interface' });
});

// Define the endpoint
router.post('/api/ai-check', verifyToken, aiController.getSentiment);

router.post('/api/chat', verifyToken, aiController.chat);

module.exports = router;
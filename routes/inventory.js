const express = require('express');
const router = express.Router();

router.get('/stocks', (req, res) => {
    res.render('inventory/stocks', { title: 'Stock Management' });
});


module.exports = router;
const express = require('express');
const router = express.Router();
const curtainController = require('../controllers/curtain-controller');

// Route này để Vercel gọi tới: POST /api/curtain/control
router.post('/control', curtainController.controlCurtain);

module.exports = router;
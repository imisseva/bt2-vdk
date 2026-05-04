const express = require('express');
const { controlFeeder } = require('../controllers/feeder-controller');

const router = express.Router();

router.post('/control', controlFeeder);

module.exports = router;
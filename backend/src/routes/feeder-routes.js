const express = require('express');
const { controlFeeder, updateSchedule } = require('../controllers/feeder-controller');

const router = express.Router();

router.post('/control', controlFeeder);
router.post('/schedule', updateSchedule);

module.exports = router;
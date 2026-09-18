const express = require('express');
const { recommendations } = require('../controllers/RecommendationController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', recommendations);

module.exports = router;
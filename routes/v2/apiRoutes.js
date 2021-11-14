const express = require('express');
const mnoV1PrivateRoutes = require('../v1/apiRoutes');
const mnoV2PrivateRoutes = require('./Apis/private');
const router = express.Router();

router.use('/private', mnoV2PrivateRoutes);
router.use(mnoV1PrivateRoutes);

module.exports = router;
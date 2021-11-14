const express = require('express');
const v1PrivateRoutes = require('./Apis/private');
// const v2Routes = require('./v2/');
const router = express.Router();

router.use('/private', v1PrivateRoutes);

module.exports = router;
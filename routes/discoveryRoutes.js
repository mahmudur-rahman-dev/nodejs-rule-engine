const express = require('express');
const router = express.Router();

const apiV1 = require('./v1/apiRoutes');
const apiV2 = require('./v2/apiRoutes');

router.use('/api/v1', apiV1);
router.use('/api/v2', apiV2);
router.get('/test', function(req, res) {
    console.log("heyyyyyyyyy");
})

module.exports = router;
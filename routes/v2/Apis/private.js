//required libraries
const express = require('express');
const router = express.Router();
const mnoApis = require('./mnoApis');

router.use('/mno', mnoApis);
module.exports = router;

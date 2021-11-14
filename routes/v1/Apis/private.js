//required libraries
const express = require('express');
const router = express.Router();
const mnoApis = require('./mnoApis');
const nationalDBApis = require('./nationalDBApis');
router.use('/mno', mnoApis);
router.use('/national-db', nationalDBApis);
module.exports = router;

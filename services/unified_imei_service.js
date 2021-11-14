const mobileNumExtracter = require('./mobile_num_extract_service')
const Url = require('../constants/backend_url');


/**
 * 
 * @param {*} body 
 */
function executeUnifiedIMEIRule (body) {
    body.searchCriteria = 2
    mobileNumExtracter.extractMobileNum(body)
};

module.exports = {executeUnifiedIMEIRule};
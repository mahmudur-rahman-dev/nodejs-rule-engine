const mobileNumExtracter = require('./mobile_num_extract_service')
const Url = require('../constants/backend_url');
/**
 * 
 * @param {s} body 
 */
function executeUnifiedIMSIRule (body) {
    body.searchCriteria = 3
    mobileNumExtracter.extractMobileNum(body)
};

module.exports = {executeUnifiedIMSIRule};
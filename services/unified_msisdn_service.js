const unifiedMsisdnRule = require("../rules/unified_msisdn_rules");
/**
 * 
 * @param {*} body 
 */
const executeUnifiedMsisdnRule = function (body) {
    unifiedMsisdnRule.unifiedMsisdnRule(body);
};

module.exports = { executeUnifiedMsisdnRule };
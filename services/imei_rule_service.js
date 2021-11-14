const imeiCDRRule = require("../rules/imei_cdr_rule");
// const imeiRule = require("../rules/imei_rule");
/**
 * 
 * @param {*} body 
 */
const executeIMEIRuleForDiscovery = function (body) {
   
    imeiCDRRule.imeiCRDRuleForDiscovery(body);
    // imeiRule.imeiRuleForDiscovery(body)
};

module.exports = {executeIMEIRuleForDiscovery };
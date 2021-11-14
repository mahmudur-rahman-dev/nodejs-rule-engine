const msisdnRule = require("../rules/msisdn_rule");

/**
 * 
 * @param {*} body 
 */
const executeMsisdnRuleForDiscovery = function (body) {
    msisdnRule.msisdnRuleForDiscovery(body);
};

module.exports = { executeMsisdnRuleForDiscovery };
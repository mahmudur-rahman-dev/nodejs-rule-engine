const passportRule = require("../rules/passport_rule");
/**
 * 
 * @param {*} body 
 */
const executePassportRuleForDiscovery = function (body) {
    passportRule.passportRuleForDiscovery(body);
};

module.exports = { executePassportRuleForDiscovery };
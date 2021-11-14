const unifiedPassportRule = require("../rules/unified_passport_rules");
/**
 * 
 * @param {*} body 
 */
const executeUnifiedPassportRule = function (body) {
    unifiedPassportRule.unifiedPassportRule(body);
};

module.exports = { executeUnifiedPassportRule };
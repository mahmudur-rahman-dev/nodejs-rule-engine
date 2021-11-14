const unifiedNidRule = require("../rules/unified_nid_rules");
/**
 * 
 * @param {*} body 
 */
const executeUnifiedNidRule = function (body) {
    unifiedNidRule.unifiedNidRule(body);
};

module.exports = { executeUnifiedNidRule };
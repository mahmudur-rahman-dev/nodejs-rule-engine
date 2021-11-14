const nidRule = require("../rules/nid_rule");
/**
 * 
 * @param {*} body 
 */
const executeNidRuleForDiscovery = function (body) {
    nidRule.nidRuleForDiscovery(body);
};

module.exports = { executeNidRuleForDiscovery };
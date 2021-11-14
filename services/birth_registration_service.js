const birthRegistration = require("../rules/birth_registration_rule");

/**
 * 
 * @param {*} body 
 */
const executeBirthRegistrationRuleForDiscovery = function (body) {
    birthRegistration.birthRegistrationRuleForDiscovery(body);
};

module.exports = { executeBirthRegistrationRuleForDiscovery };
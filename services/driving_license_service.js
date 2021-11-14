const drivingLicenseRule = require("../rules/driving_license_rule");
/**
 * 
 * @param {*} body 
 */
const executeDrivingLicenseRuleForDiscovery = function (body) {
    drivingLicenseRule.drivingLicenseRuleForDiscovery(body);
};

module.exports = { executeDrivingLicenseRuleForDiscovery };
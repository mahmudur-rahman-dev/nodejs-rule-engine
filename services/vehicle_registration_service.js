const vehicleRegistration = require("../rules/vehicle_registration_rule");
/**
 * 
 * @param {*} body 
 */
const executeVehicleRegistrationRuleForDiscovery = function (body) {
    vehicleRegistration.vehicleRegistrationRuleForDiscovery(body);
};

module.exports = { executeVehicleRegistrationRuleForDiscovery };
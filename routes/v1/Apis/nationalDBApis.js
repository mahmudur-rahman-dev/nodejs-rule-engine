const express = require('express');
const router = express.Router();
const nidRuleService = require("../../../services/nid_rule_service")
const passportRuleService = require("../../../services/passport_rule_service");
const drivingLicenseRuleService = require("../../../services/driving_license_service");
const vehicleRegistrationRuleService = require("../../../services/vehicle_registration_service");
const birthRegistrationRuleService = require("../../../services/birth_registration_service");
const unifiedNidService = require("../../../services/unified_nid_service");
const unifiedNidDobService = require("../../../services/unified_nid_dob_service");
const unifiedPassportService = require("../../../services/unified_passport_service");
const initiateNID = function (req, res) {
    console.log('requested nid body -> ', req.body);
    nidRuleService.executeNidRuleForDiscovery(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ 'message': 'POST request to homepage for NID discovery' }));
}

const initiateUnifiedNid = function (req, res) {
    console.log('requested nid body -> ', req.body);
    unifiedNidService.executeUnifiedNidRule(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ 'message': 'POST request to homepage for NID Unified Mode' }));
}

const initiateUnifiedNidDob = function (req, res) {
    console.log('requested nid body -> ', req.body);
    unifiedNidDobService.executeUnifiedNidRule(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ 'message': 'POST request to homepage for NID Unified Mode' }));
}

const initiatePassport = function (req, res) {
    console.log('requested passport -> ', req.body);
    passportRuleService.executePassportRuleForDiscovery(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ 'message': 'POST request to homepage for Passport discovery' }));
}

const initiateUnifiedPassport = function (req, res) {
    console.log('requested passport -> ', req.body);
    unifiedPassportService.executeUnifiedPassportRule(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ 'message': 'POST request to homepage for Passport Unified Mode' }));
}

const initiateDrivingLicense = function (req, res) {
    console.log('requested driving_license -> ', req.body);
    drivingLicenseRuleService.executeDrivingLicenseRuleForDiscovery(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ 'message': 'POST request to homepage for Driving License discovery' }));
}

const initiateVehicleRegistration= function (req, res) {
    console.log('requested vehicle_registration -> ', req.body);
    vehicleRegistrationRuleService.executeVehicleRegistrationRuleForDiscovery(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ 'message': 'POST request to homepage for Vehicle Registration discovery' }));
}

const initiateBirthRegistration = function (req, res) {
    console.log('requested birth_registration -> ', req.body);
    birthRegistrationRuleService.executeBirthRegistrationRuleForDiscovery(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ 'message': 'POST request to homepage for Birth Registration discovery' }));
}
router.post('/nid', initiateNID);
router.post('/passport', initiatePassport);
router.post('/driving-license', initiateDrivingLicense);
router.post('/vehicle-registration', initiateVehicleRegistration);
router.post('/birth-registration', initiateBirthRegistration);

// Unified Mode URL
router.post('/unified-nid', initiateUnifiedNid);
router.post('/unified-nid-dob', initiateUnifiedNidDob);
router.post('/unified-passport', initiateUnifiedPassport);

module.exports = router;
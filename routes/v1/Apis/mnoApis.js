const express = require('express');
const router = express.Router();
const msisdnRuleService = require("../../../services/msisdn_rule_service")
const imeiRuleService = require("../../../services/imei_rule_service")
const unifiedMsisdnRuleService = require("../../../services/unified_msisdn_service")
const unifiedIMEIRuleService = require("../../../services/unified_imei_service")
const unifiedIMSIRuleService = require("../../../services/unified_imsi_service")
const initiateMSISDNRule = function (req, res) {
    console.log('requested cdr -> ', req.body);
    msisdnRuleService.executeMsisdnRuleForDiscovery(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ 'message': 'POST request to homepage for MSISDN discovery' }));
};

const initiateIMEIRule = function (req, res) {
    console.log('requested imei -> ', req.body);
    imeiRuleService.executeIMEIRuleForDiscovery(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ 'message': 'POST request to homepage for IMEI discovery' }));
};

const initiateUnifiedIMEIRule = function (req, res) {
    console.log('requested imei -> ', req.body);
    unifiedIMEIRuleService.executeUnifiedIMEIRule(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ 'message': 'POST request to homepage for Unified IMEI ' }));
};

const initiateUnifiedIMSIRule = function (req, res) {
    console.log('requested imei -> ', req.body);
    unifiedIMSIRuleService.executeUnifiedIMSIRule(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ 'message': 'POST request to homepage for Unified IMSI ' }));
}

const initiateUnifiedMSISDNRule = function (req, res) {
    console.log('requested cdr -> ', req.body);
    unifiedMsisdnRuleService.executeUnifiedMsisdnRule(req.body);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ 'message': 'POST request to homepage for MSISDN Unified' }));
};



router.post('/msisdn', initiateMSISDNRule);
router.post('/imei', initiateIMEIRule);

router.post('/unified-msisdn', initiateUnifiedMSISDNRule);
router.post('/unified-imei', initiateUnifiedIMEIRule);
router.post('/unified-imsi',initiateUnifiedIMSIRule );

module.exports = router;
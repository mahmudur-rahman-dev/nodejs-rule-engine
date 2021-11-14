const express = require('express');
var getRepoInfo = require('git-repo-info');
const cors = require('cors');

const msisdnRuleService = require("./services/msisdn_rule_service")
const imeiRuleService = require("./services/imei_rule_service")
const nidRuleService = require("./services/nid_rule_service")
const passportRuleService = require("./services/passport_rule_service");
const drivingLicenseRuleService = require("./services/driving_license_service");
const vehicleRegistrationRuleService = require("./services/vehicle_registration_service");
const birthRegistrationRuleService = require("./services/birth_registration_service");

const app = express();
const config = require('./config/config');
const discoveryRoutes = require('./routes/discoveryRoutes');
const router = express.Router();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use('/discovery', discoveryRoutes);

const HOST = '0.0.0.0';
const PORT = process.env.PORT || 5000;

app.get('/', function (req, res) {
    const gitInfo = getRepoInfo();
    res.send({
        host: HOST,
        port: PORT,
        message: "Rule engine running...."
    });
})
app.get('/healthcheck', function (req, res) {
    const gitInfo = getRepoInfo();
    console.log('checking health...');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
        status: 200,
        branch: gitInfo.branch,
        sha: gitInfo.sha,
        commiter: gitInfo.committer,
        date: gitInfo.committerDate,
        message: gitInfo.commitMessage
    }));
})
// app.post('/discovery/nid', function (req, res) {
//     console.log('requested nid body -> ', req.body);
//     nidRuleService.executeNidRuleForDiscovery(req.body);
//     res.setHeader('Content-Type', 'application/json');
//     res.send(JSON.stringify({ 'message': 'POST request to homepage for NID discovery' }));
// });
// app.post('/discovery/cdr', function (req, res) {
//     console.log('requested cdr -> ', req.body);
//     msisdnRuleService.executeMsisdnRuleForDiscovery(req.body);
//     res.setHeader('Content-Type', 'application/json');
//     res.send(JSON.stringify({ 'message': 'POST request to homepage for CDR discovery' }));
// })
// app.post('/discovery/imei', function (req, res) {
//     console.log('requested imei -> ', req.body);
//     imeiRuleService.executeIMEIRuleForDiscovery(req.body);
//     res.setHeader('Content-Type', 'application/json');
//     res.send(JSON.stringify({ 'message': 'POST request to homepage for IMEI discovery' }));
// })
// app.post('/discovery/passport', function (req, res) {
//     console.log('requested passport -> ', req.body);
//     passportRuleService.executePassportRuleForDiscovery(req.body);
//     res.setHeader('Content-Type', 'application/json');
//     res.send(JSON.stringify({ 'message': 'POST request to homepage for Passport discovery' }));
// })

// app.post('/discovery/driving_license', function (req, res) {
//     console.log('requested driving_license -> ', req.body);
//     drivingLicenseRuleService.executeDrivingLicenseRuleForDiscovery(req.body);
//     res.setHeader('Content-Type', 'application/json');
//     res.send(JSON.stringify({ 'message': 'POST request to homepage for Driving License discovery' }));
// })

// app.post('/discovery/v/vehicle_registration', function (req, res) {
//     console.log('requested vehicle_registration -> ', req.body);
//     vehicleRegistrationRuleService.executeVehicleRegistrationRuleForDiscovery(req.body);
//     res.setHeader('Content-Type', 'application/json');
//     res.send(JSON.stringify({ 'message': 'POST request to homepage for Vehicle Registration discovery' }));
// })

// app.post('/discovery/birth_registration', function (req, res) {
//     console.log('requested birth_registration -> ', req.body);
//     birthRegistrationRuleService.executeBirthRegistrationRuleForDiscovery(req.body);
//     res.setHeader('Content-Type', 'application/json');
//     res.send(JSON.stringify({ 'message': 'POST request to homepage for Birth Registration discovery' }));
// })

console.log(`Rule engine running on http://${HOST}:${PORT}`);
app.listen(PORT);
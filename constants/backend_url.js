const config = require('../config/config');

const baseURL = config.backendApi.baseUrl+':'+config.backendApi.apiPort+config.backendApi.suffixUrl;
const nidURL = baseURL + config.backendApi.nidPath;
const cdrURL = baseURL + config.backendApi.cdrPath;
const smsURL = baseURL + config.backendApi.smsPath;
const esafURL = baseURL + config.backendApi.esafPath;
const mnoURL = config.backendApi.mnoURL;
const passportURL = baseURL + config.backendApi.passportPath ;
const drivingLicenseURL = baseURL +  config.backendApi.drivingLicensePath;
const vehicleRegistrationURL = baseURL + config.backendApi.vehicleRegistrationPath;
const birthRegistrationURL = baseURL + config.backendApi.birthRegistrationPath;
const deviceInfoURL = baseURL + config.backendApi.deviceInformationPath;
const socketURL = config.backendApi.baseUrlSocket+':'+config.backendApi.socketPort;
const caseManagementBaseUrl = config.backendApi.caseManagementServiceBaseUrl;
const caseManagementUnifiedViewerCreationURLPath = config.backendApi.caseManagementServiceUnifiedViewerCreationURLPath;
const caseManagementUnifiedViewerSearchByDiscoveryIdSURL = caseManagementBaseUrl + config.backendApi.unifiedViewerSearchByDiscoveryIdPath;
const caseManagementUnifiedViewerCreationURL = caseManagementBaseUrl + caseManagementUnifiedViewerCreationURLPath;

module.exports = {
    nidURL, passportURL,drivingLicenseURL, socketURL, cdrURL,smsURL,esafURL,mnoURL,vehicleRegistrationURL
    ,birthRegistrationURL,deviceInfoURL, caseManagementUnifiedViewerSearchByDiscoveryIdSURL, caseManagementUnifiedViewerCreationURL
}
'use strict'

var colors = require('colors/safe');
const { Engine } = require('json-rules-engine');
const Api = require('../api');
const Url = require('../constants/backend_url');
const Util = require('../util/util');
const EmptyBodies = require('../constants/response_bodies');
const Redis = require('../util/redis')
const RequestTypes = require('../constants/request_type')
const SelectionCriterias = require('../constants/selection_criterias')
const { socket_init, socketSyncInit , destroySocket} = require('../socket_client/service');
const moment = require('moment');

/**
 * Initiate MSISDN discovery rule
 * @param {*} body 
 */
async function msisdnRuleForDiscovery(body) {
    const engine = new Engine();

    const CDR_PRIORITY = 100;
    const ESAF_INIT_PRIORITY = 100;
    const SMS_PRIORITY = 100;
    const LRL_PRIORITY = 100;
    const DRIVING_LICENSE_PRIORITY = 100;
    const NID_PRIORITY = 90;
    const DEVICE_INFO_PRIORITY = 90;
    const VEHICLE_REGISTRATION_PRIORITY = 100;

    // Rules
    /**
     * rules need to be satisfied to run rule engine
     */
    const rule_msisdn = {
        conditions: {
            all: [
                {
                    fact: 'CDR',
                    operator: 'equal',
                    value: true
                },
                
                {
                    fact: 'ESAF_INIT',
                    operator: 'equal',
                    value: true
                },
                
                {
                    fact: 'SMS',
                    operator: 'equal',
                    value: true
                },
                {
                    fact: 'LRL',
                    operator: 'equal',
                    value: true
                },
                {
                    fact: 'DRIVING_LICENSE_API',
                    operator: 'equal',
                    value: true
                },
                {
                    fact: 'VEHICLE_REGISTRATION',
                    operator: 'equal',
                    value: true
                },
                
                {
                    fact: 'NID',
                    operator: 'equal',
                    value: true
                },
                {
                    fact: 'DEVICE_INFO',
                    operator: 'equal',
                    value: true
                }
               
            ]
        },
        event: {
            type: 'msisdnDiscovery',
            params: {
                message: 'successfully completed CDR discovery!'
            }
        }
    };

    engine.addRule(rule_msisdn);

    let keys = Object.keys(body);
    const nid_info = new Array();
    let rule_engine_channel;
    let cdr_rule_engine_channel;

    // Events
    engine
        .on('success', event => {
            console.log(colors.yellow(event.params.message))
        })
        .on('failure', event => {
            Redis.publishToChannels(EmptyBodies.json_empty_nid_body, body.channels)
            console.log(colors.red("Failed to complete CDR discovery!"))
        });


    cdr_rule_engine_channel = "rule_engine_cdr_" + body.channels[0];
    let cdrListenSocket = await socketSyncInit(cdr_rule_engine_channel);
    console.log("Socket Init Complete for cdr")


    /// call 1
     /**
     * a post call is made to query service with dubBody 
     * dubBody is required for added socket channel and some required field
     */
    engine.addFact('CDR', (params, almanac) => {
        return almanac.factValue(keys[0])
            .then( async () => {
                let cdr_body = {
                    "userId": body.userId || null,
                    "caseId": body.caseId || null,
                    "agencyId": body.agencyId || null,
                    "searchMode": body.searchMode || null,
                    "requestType": RequestTypes.RequestTypes.CDR,
                    "searchCriteria": body.searchCriteria,
                    "searchValue": body.searchValue,
                    "startDate": body.startDate,
                    "endDate": body.endDate,
                    "channels": [...body.channels, cdr_rule_engine_channel],
                    "discoveryId": body.discoveryId || null,
                    "unifiedViewerId": body.unifiedViewerId || null
                }
                console.log("CDR BODY:", cdr_body);
                //  Api.axiosCall(Url.cdrURL, cdr_body);
                let response = await Api.asyncAxiosCall(Url.cdrURL, cdr_body, cdrListenSocket);
                // let response = await Api.asyncAxiosCall(Url.esafURL, esaf_body, socket);
                destroySocket(cdrListenSocket);
                console.log(colors.green("[Level 1] Completed CDR request!"+ response));
                console.log('CDR fact ended')
                return true;
            });
    }, { priority: CDR_PRIORITY });
     /**
     * a post call is made to query service with dubBody 
     * dubBody is required for added socket channel and some required field
     */
    engine.addFact('DRIVING_LICENSE_API', (params, almanac) => {
        return almanac.factValue(keys[0])
            .then(async () => {
                let dubBody = {
                    "userId": body.userId || null,
                    "caseId": body.caseId || null,
                    "agencyId": body.agencyId || null,
                    "searchMode": body.searchMode || null,
                    "parameterType": "mobileNumber",
                    "parameterValue": body.searchValue,
                    "channels": body.channels,
                    "discoveryId": body.discoveryId || null,
                    "unifiedViewerId": body.unifiedViewerId || null
                };
                Api.axiosCall(Url.drivingLicenseURL, dubBody);
                // console.log(colors.green("[Level 1] Completed DRIVING LICENSE request for rule engine", dubBody));
                return true;
            });
    }, { priority: DRIVING_LICENSE_PRIORITY });

    /// call 2

    rule_engine_channel = "rule_engine_" + body.channels[0];
    let socket = await socketSyncInit(rule_engine_channel);
    console.log("Socket Init Complete")

     /**
     * a post call is made to query service with dubBody 
     * dubBody is required for added socket channel and some required field
     * This Fact need to wait for response to socket channel of the post call
     * before the next fact is excuted
     */
    engine.addFact('ESAF_INIT', (params, almanac) => {
        return almanac.factValue(keys[0])
            .then(async () => {
                const currUnixTime = Math.floor(new Date().getTime() / 1000) - Util.daysInSeconds(1);
                let esaf_body = {
                    "userId": body.userId || null,
                    "caseId": body.caseId || null,
                    "agencyId": body.agencyId || null,
                    "searchMode": body.searchMode || null,
                    "requestType": RequestTypes.RequestTypes.ESAF,
                    "searchCriteria": 1,
                    "searchValue": body.searchValue,
                    "startDate": currUnixTime - Util.daysInSeconds(7),
                    "endDate": currUnixTime,
                    "channels": [...body.channels, rule_engine_channel],
                    "discoveryId": body.discoveryId || null,
                    "unifiedViewerId": body.unifiedViewerId || null
                }
                console.log("ESAF INIT BODY:", esaf_body);
                let response = await Api.asyncAxiosCall(Url.esafURL, esaf_body, socket);
                destroySocket(socket);
                console.log("[Level 1] Completed first ESAF request for rule engine!", " Response Record NID: ", response);
                if (response && response.hasOwnProperty("numberofRecordsFound") && response.numberofRecordsFound == 0) {
                    return false;
                }
                nid_info.push(response.responseRecord[0].nid);
                let dob = moment(response.responseRecord[0].birthDate).format("YYYY-MM-DD")
                nid_info.push(dob);
                console.log('ESAF fact ended')
                return true;
            });
    }, { priority: ESAF_INIT_PRIORITY });

    /// call 3
     /**
     * a post call is made to query service with dubBody 
     * dubBody is required for added socket channel and some required field
     */
    engine.addFact('SMS', (params, almanac) => {
        return almanac.factValue(keys[0])
            .then(() => {
                let sms_body = {
                    "userId": body.userId || null,
                    "caseId": body.caseId || null,
                    "agencyId": body.agencyId || null,
                    "searchMode": body.searchMode || null,
                    "requestType": RequestTypes.RequestTypes.SMS,
                    "searchCriteria": 1,
                    "searchValue": body.searchValue,
                    "startDate": body.startDate,
                    "endDate": body.endDate,
                    "channels": body.channels,
                    "discoveryId": body.discoveryId || null,
                    "unifiedViewerId": body.unifiedViewerId || null
                }
                console.log("SMS API BODY:", sms_body);
                Api.axiosCall(Url.smsURL, sms_body);
                console.log(colors.green("[Level 1] Completed SMS request!"));
                return true;
            });
    }, { priority: SMS_PRIORITY });

    /// call 4
        /**
     * a post call is made to spring Backend with dubBody 
     * dubBody is required for added socket channel and some required field
     */
    engine.addFact('LRL', (params, almanac) => {
        return almanac.factValue(keys[0])
            .then(() => {
                let lrl_body = {
                    "userId": body.userId || null,
                    "caseId": body.caseId || null,
                    "agencyId": body.agencyId || null,
                    "searchMode": body.searchMode || null,
                    "msisdn": body.searchValue,
                    "requestData": RequestTypes.RequestTypes.LRL,
                    "selectionCriteria": SelectionCriterias.SelectionCriterias.MSISDN,
                    "channels": body.channels,
                    "discoveryId": body.discoveryId || null,
                    "unifiedViewerId": body.unifiedViewerId || null
                }
                console.log("LRL API BODY:", lrl_body);
                Api.axiosCall(Url.mnoURL, lrl_body);
                console.log(colors.green("[Level 1] Completed LRL request!"));
                return true;
            });
    }, { priority: LRL_PRIORITY });

    /**
     * A post request is made to query-service with vehicle-reg request body
     */
    engine.addFact('VEHICLE_REGISTRATION', (params, almanac) => {
        return almanac.factValue(keys[0])
            .then(() => {
                console.log("vehicle-registration");
                
                let vehicle_reg_body = {
                    "userId": body.userId || null,
                    "caseId" : body.caseId || null,
                    "agencyId" : body.agencyId || null,
                    "searchMode" : body.searchMode || null,
                    "channels" : [...body.channels],
                    "discoveryId": body.discoveryId || null,
                    "requestType": RequestTypes.RequestTypes.VEHICLEREGISTRATION,
                    "selectionCriteria" : SelectionCriterias.SelectionCriterias.MSISDN,
                    "mobileNumber": body.searchValue
                }

                let url = Url.vehicleRegistrationURL
                console.log("vehicle-reg url: "+url+ "    vehicle-reg API BODY: ", vehicle_reg_body)
                Api.axiosCall(url, vehicle_reg_body);
                return true;

            });
    }, {priority: VEHICLE_REGISTRATION_PRIORITY});


    /// call 2->1
    /**
     * a post call is made to query service with dubBody 
     * dubBody is required for added socket channel and some required field
     */
    engine.addFact('NID', (params, almanac) => {
        return almanac.factValue(keys[0])
            .then(async () => {

                let nid_body = {
                    "userId": body.userId || null,
                    "caseId": body.caseId || null,
                    "agencyId": body.agencyId || null,
                    "searchMode": body.searchMode || null,
                    "nidNumber": nid_info[0],
                    "dateOfBirth": nid_info[1],
                    "channels": [...body.channels],
                    "discoveryId": body.discoveryId || null,
                    "unifiedViewerId": body.unifiedViewerId || null
                }
                console.log("NID API BODY:", nid_body);
                Api.axiosCall(Url.nidURL, nid_body);
                // console.log(colors.green("[Level 2] Completed NID request!"));
                // if (!response) return false;
                // console.log(colors.green("[Level 2] Received valid data for NID request..."))
                // nids = [response.nid10Digit, response.nid17Digit];
                return true;
            });
    }, { priority: NID_PRIORITY });


    engine.addFact('DEVICE_INFO',  (params, almanac) => {
        return almanac.factValue(keys[0])
            .then(() => {
                console.log("device-info ");

                let device_info_body = {
                    "userId": body.userId || null,
                    "caseId": body.caseId || null,
                    "agencyId": body.agencyId || null,
                    "searchMode": body.searchMode || null,
                    "channels": [...body.channels],
                    "discoveryId": body.discoveryId || null,
                    "requestType": RequestTypes.RequestTypes.DEVICEINFORMATION,
                    "searchCriteria":  SelectionCriterias.SelectionCriterias.MSISDN,
                    "searchValue": body.searchValue
                    
                }
                let url = Url.deviceInfoURL
                console.log("device-info url: "+ url+"   device-info API BODY:", device_info_body);
                Api.axiosCall(url, device_info_body);
                return true;
            });
    }, { priority: DEVICE_INFO_PRIORITY });

    

    
    // /// call 2->1->(1,2)
    // engine.addFact('ESAF', (params, almanac) => {
    //     return almanac.factValue(keys[0])
    //         .then(() => {
    //             let idx = 1;
    //             nids.forEach(nid => {
    //                 const currUnixTime = Math.floor(new Date().getTime() / 1000);
    //                 console.log(colors.magenta("Requested nid number : ", nid));
    //                 let esaf_body = {
    //                     "msisdn" : nid,
    //                     "startDate" : currUnixTime - Util.daysInSeconds(7),
    //                     "endDate" : currUnixTime,
    //                     "requestData" : "ESAF",
    //                     "selectionCriteria" : "NID",
    //                     "channels": body.channels,
    //                     "discoveryId": body.discoveryId
    //                 }
    //                 Api.axiosCall(Url.mnoURL, esaf_body);
    //                 console.log(colors.green("[Level 3] Completed ESAF request...(" + idx + ")"));
    //                 idx+=1;
    //             })
    //             return true;
    //         });
    // }, {priority: ESAF_PRIORITY});

    await engine.run(body)
}

module.exports = {
    msisdnRuleForDiscovery
};
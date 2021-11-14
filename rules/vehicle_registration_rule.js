'use strict'

const {
    Engine
} = require('json-rules-engine');
const Api = require('../api');
const Url = require('../constants/backend_url');
const Util = require('../util/util');
const requestBody = require('../constants/request_body_generator');
const addFact = require('../facts/nid_esaf_facts');
const EmptyBodies = require('../constants/response_bodies');
const Redis = require('../util/redis')
const RequestTypes = require('../constants/request_type')
const { onVehicleRuleFailure } = require('../services/rule_chain_failure_service');

const moment = require('moment');

const {
    socket_init, socketSyncInit, destroySocket
} = require('../socket_client/service');
const { constant } = require('lodash');

/**
 * Initiate Vehicle Registration discovery rule
 * @param {*} body 
 */
async function vehicleRegistrationRuleForDiscovery(body) {

    const engine = new Engine();

    const VEHICLE_REGISTRATION_PRIORITY = 100;
    const ESAF_INIT_PRIORITY = 80;

    const NID_PRIORITY = 50;
    const ESAF_PRIORITY = 40;
    const ruleEngineChannel = "rule_engine_" + body.channels[0];

    const emptyBodies = [EmptyBodies.json_empty_esaf_body, EmptyBodies.json_empty_nid_body, EmptyBodies.json_empty_vehicle_body]

    var searchedWidth = body.zone + "-"+body.series+"-"+ body.vehicleNumber
    let socket = await socketSyncInit(ruleEngineChannel);
    console.log("Socket Init Complete");

    // Rules
    const ruleVehicleRegistration = {
        conditions: {
            all: [{
                fact: 'VEHICLE_REGISTRATION_API',
                operator: 'greaterThanInclusive',
                value: 10,
                path: '$.searchValue.length'
            },
            {
                fact: 'ESAF_API_INIT',
                operator: 'greaterThanInclusive',
                value: 10,
                path: '$.nidNumber.length'
            },
            {
                fact: 'NID_API',
                operator: 'greaterThanInclusive',
                value: 1,
                path: '$.nids.length'
            },
            {
                fact: 'ESAF_API',
                operator: 'equal',
                value: true
            }
            ]
        },
        event: {
            type: 'VEHICLE_REGISTRATION_API_CALL'
        }
    };
    engine.addRule(ruleVehicleRegistration);

    let keys = Object.keys(body);

    const bodyCopy = body

    engine
        .on('success', event => {
            destroySocket(socket);
            console.log(event);
        })
        .on('failure', event => {
            console.log("VEHICLE RULE FAILURE")
            destroySocket(socket);
            onVehicleRuleFailure(emptyBodies, bodyCopy, searchedWidth)
        });

    engine.addFact('VEHICLE_REGISTRATION_API', (params, almanac) => {
        return almanac.factValue(keys[0])
            .then(async () => {
                try {
                    console.log("IN : VEHICLE_REGISTRATION_API")
                    let dubChannel = body.channels;
                    dubChannel.push(ruleEngineChannel);
                    emptyBodies.pop()
                    let dubBody = {
                        "userId": body.userId || null,
                        "caseId": body.caseId || null,
                        "agencyId": body.agencyId || null,
                        "searchMode": body.searchMode || null,
                        "zone": body.zone,
                        "series": body.series,
                        "vehicleNumber": body.vehicleNumber,
                        "channels": dubChannel
                    };
                    const vehicleRegistrationResponse = await Api.asyncAxiosCall(Url.vehicleRegistrationURL, dubBody, socket);
                    console.log("vehicle-response-list-----", vehicleRegistrationResponse)
                    const vehicleRegistration = vehicleRegistrationResponse["responseRecords"][0]

                    console.log("vehicle-response-----", vehicleRegistration)

                    let nidNumber = vehicleRegistration.nidNumber;
                    if (vehicleRegistration.mobileNumber.length > 10) {
                        const currUnixTime = Math.floor(new Date().getTime() / 1000) - Util.daysInSeconds(1);
                        let esaf_body = {
                            "userId": body.userId || null,
                            "caseId": body.caseId || null,
                            "agencyId": body.agencyId || null,
                            "searchMode": body.searchMode || null,
                            "requestType": RequestTypes.RequestTypes.ESAF,
                            "searchCriteria": 1,
                            "searchValue": vehicleRegistration.mobileNumber,
                            "startDate": currUnixTime - Util.daysInSeconds(7),
                            "endDate": currUnixTime,
                            "channels": [ruleEngineChannel]
                        }
                        return esaf_body
                    }
                    // let dob = drivingLicense.drivingLicenseRecord[0].dateOfBirth;
                    console.log("vehicle Registration Number: ", vehicleRegistration.vehicleRegistrationNumber, "NID Number: ", nidNumber);
                    // return requestBody.getNidRequestBody(nidNumber, dob, dubChannel);
                    return { "searchValue": "" };
                } catch (error) {
                    return { "searchValue": "" };
                }
            });
    }, { priority: VEHICLE_REGISTRATION_PRIORITY });

    engine.addFact('ESAF_API_INIT', (params, almanac) => {
        return almanac.factValue('VEHICLE_REGISTRATION_API')
            .then(async (esaf_body) => {
                try {
                    console.log("IN : ESAF_API_INIT")
                    emptyBodies.pop()
                    if (esaf_body.hasOwnProperty('requestType')) {
                        
                        console.log("ESAF BODY:", esaf_body);
                        if (esaf_body.hasOwnProperty('searchValue')) searchedWidth = esaf_body["searchValue"]
                        let response = await Api.asyncAxiosCall(Url.esafURL, esaf_body, socket);
                        console.log("esaf response in vehicle-rule ", response)
                        if (response && (response.numberofRecordsFound && response.numberofRecordsFound == 0)) return { "nidNumber": "" };
                        let dubChannel = [...body.channels, ruleEngineChannel];
                        esaf_body.channels = dubChannel
                        let dob = moment(response.responseRecord[0].birthDate).format('YYYY-MM-DD')
                        return requestBody.getNidRequestBody(response.responseRecord[0].nid, dob, esaf_body);
                    }
                } catch (Error) {
                    return { "nidNumber": "" };
                }
                return { "nidNumber": "" };
            });
    }, { priority: ESAF_INIT_PRIORITY });

    engine.addFact('NID_API', (params, almanac) => {
        return almanac.factValue('ESAF_API_INIT')
            .then(async (nidBody) => {
                try {
                    emptyBodies.pop()
                    console.log("IN : NID_API || NID_ESAF_FACTS")
                    searchedWidth = nidBody.nidNumber
                    const nid = await Api.asyncAxiosCall(Url.nidURL, nidBody, socket);
                    // if (!nid) return false;
                    console.log("NID Number - ", nid);
                    const nids = (nid && nid.hasOwnProperty("nid10Digit")) ? { "nids": [nid.nid10Digit, nid.nid17Digit], "channels": nidBody.channels } : { "nids": [], "channels": [] };
                    console.log("NID Number - ", nids);
                    return nids;
                } catch (Error) {
                    const nids = { "nids": [], "channels": [] };
                    return nids
                }

            });
    }, { priority: NID_PRIORITY });

    engine.addFact('ESAF_API', (params, almanac) => {
        return almanac.factValue('NID_API')
            .then((newBody) => {
                try {
                    emptyBodies.pop()
                    console.log("IN : NID_API || NID_ESAF_FACTS || With NIDS", newBody.nids);
                    newBody.nids.forEach(nid => {
                        const currUnixTime = Math.floor(new Date().getTime() / 1000) - Util.daysInSeconds(1);
                        console.log("nid is : ", nid);
                        
                        let dubBody = {
                            "userId": body.userId || null,
                            "caseId": body.caseId || null,
                            "agencyId": body.agencyId || null,
                            "searchMode": body.searchMode || null,
                            "requestType": RequestTypes.RequestTypes.ESAF,
                            "searchCriteria": 4,
                            "searchValue": nid,
                            "startDate": currUnixTime - Util.daysInSeconds(7),
                            "endDate": currUnixTime,
                            "channels": [...body.channels]
                        };
                        searchedWidth = dubBody.searchValue
                        Api.axiosCall(Url.esafURL, dubBody);
                    })
                    return true;
                } catch (Error) {
                    return false;
                }
            });
    }, { priority: ESAF_PRIORITY });

    // addFact.addNidEsafFacts('ESAF_API_INIT', socket, engine);
    await engine.run(body)
}

module.exports = {
    vehicleRegistrationRuleForDiscovery
};

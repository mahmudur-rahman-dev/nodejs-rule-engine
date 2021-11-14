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
const { socket_init, socketSyncInit } = require('../socket_client/service');
const nidDrivingPassportFacts = require('../facts/nid_driving_passport_unified_facts')
const moment = require('moment');
/**
 * Initiate MSISDM unified rule
 * @param {*} body 
 */
async function unifiedMsisdnRule(body) {
    const engine = new Engine();

    // const CDR_PRIORITY = 100;
    const ESAF_PRIORITY = 100;
    // const LRL_PRIORITY = 100;
    const DRIVING_LICENSE_PRIORITY = 100;
    const NID_PRIORITY = 90;
    // Rules
    const rule_msisdn = {
        conditions: {
            all: [

                {
                    fact: 'ESAF_API',
                    operator: 'greaterThanInclusive',
                    value: 10,
                    path: '$.nid.length'
                },
                // {
                //     fact: 'LRL_API',
                //     operator: 'equal',
                //     value: true
                // },
                {
                    fact: 'DRIVING_LICENSE_API',
                    operator: 'equal',
                    value: true
                }

            ]
        },
        event: {
            type: 'unifiedMsisdnDiscovery',
            params: {
                message: 'successfully completed Unified Search!'
            }
        }
    };



    let keys = Object.keys(body);


    // Events
    engine
        .on('success', event => {
            console.log(colors.yellow(event.params.message))
        })
        .on('failure', event => {
            Redis.publishToChannels(EmptyBodies.json_empty_nid_body, body.channels)
            console.log("Failed to complete MSISDN Unified")
        });
    /// call 1

    const ruleEngineChannel = "rule_engine_" + body.channels[0];
    let socket = await socketSyncInit(ruleEngineChannel);
    console.log("Socket Init Complete")

    engine.addFact('ESAF_API', (params, almanac) => {
        return almanac.factValue(keys[0])
            .then(async () => {
                const currUnixTime = Math.floor(new Date().getTime() / 1000) - Util.daysInSeconds(1);
                let esaf_body = {
                    "userId": body.userId || null,
                    "caseId": body.caseId || null,
                    "agencyId": body.agencyId || null,
                    "searchMode": body.searchMode || null,
                    "discoveryId": body.discoveryId || null,
                    "unifiedViewerId": body.unifiedViewerId || null,
                    "requestType": RequestTypes.RequestTypes.ESAF,
                    "unifiedViewerBase" : true,
                    "searchCriteria": 1,
                    "searchValue": body.searchValue,
                    "startDate": currUnixTime - Util.daysInSeconds(7),
                    "endDate": currUnixTime,
                    "channels": [...body.channels, ruleEngineChannel]
                }
                console.log("ESAF INIT BODY:", esaf_body);
                let response = await Api.asyncAxiosCall(Url.esafURL, esaf_body, socket);
                socket.destroy();
                if (response && (response.numberofRecordsFound && response.numberofRecordsFound > 0)){
                    console.log("Completed first ESAF request for rule engine!", " Response Record NID: ", response.numberofRecordsFound);
                    console.log(" Received valid data for first ESAF request...", "ESAF INIT Response: ", response)
                    let dob = moment(response.responseRecord[0].birthDate).format("YYYY-MM-DD")
                    const nid = { nid: response.responseRecord[0].nid || null, birthDate: dob || null }
                    
                    return nid
                }
                return {nid:null}
            });
    }, { priority: ESAF_PRIORITY });

    // engine.addFact('LRL_API', (params, almanac) => {
    //     return almanac.factValue(keys[0])
    //         .then(() => {
    //             let lrl_body = {
    //                 "userId": body.userId || null,
    //                 "caseId": body.caseId || null,
    //                 "agencyId": body.agencyId || null,
    //                 "searchMode": body.searchMode || null,
    //                 "msisdn": body.searchValue,
    //                 "requestData": RequestTypes.RequestTypes.LRL,
    //                 "selectionCriteria": SelectionCriterias.SelectionCriterias.MSISDN,
    //                 "channels":[...body.channels]
    //             }
    //             console.log("LRL API BODY:", lrl_body);
    //             Api.axiosCall(Url.mnoURL, lrl_body);
    //             console.log("Completed LRL request!");
    //             return true;
    //         });
    // }, { priority: LRL_PRIORITY });

    engine.addFact('DRIVING_LICENSE_API', (params, almanac) => {
        return almanac.factValue(keys[0])
            .then(() => {
                let dubBody = {
                    "userId": body.userId || null,
                    "caseId": body.caseId || null,
                    "agencyId": body.agencyId || null,
                    "discoveryId": body.discoveryId || null,
                    "unifiedViewerId": body.unifiedViewerId || null,
                    "searchMode": body.searchMode || null,
                    "parameterType": "mobileNumber",
                    "parameterValue": body.searchValue,
                    "channels": [...body.channels]
                };
                Api.axiosCall(Url.drivingLicenseURL, dubBody);
                console.log("Completed DRIVING LICENSE request for rule engine");

                return true;
            });
    }, { priority: DRIVING_LICENSE_PRIORITY });
    
    const factParams = { fact: 'ESAF_API', engine: engine, nidPriority: NID_PRIORITY, rules: rule_msisdn, body:body}
    nidDrivingPassportFacts.addNidDrivingPassportFacts(factParams);


    engine.addRule(rule_msisdn);
    await engine.run(body)
}

module.exports = {
    unifiedMsisdnRule
};

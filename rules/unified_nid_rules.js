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
const nidDrivingPassportFacts = require('../facts/nid_driving_passport_unified_nid_facts')
/**
 * Initiate NID unified rule
 * @param {*} body 
 */
async function unifiedNidRule(body) {
    const engine = new Engine();

    // const CDR_PRIORITY = 100;
    const ESAF_PRIORITY = 100;
    const NID_PRIORITY = 90;
    // Rules
    const rule_nid = {
        conditions: {
            all: [
                {
                    fact: 'ESAF_API',
                    operator: 'greaterThanInclusive',
                    value: 10,
                    path: '$.nid.length'
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
            console.log("Failed to complete NID Only Unified")
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
                    "requestType": RequestTypes.RequestTypes.ESAF,
                    "searchCriteria": 4,
                    "searchValue": body.searchValue,
                    "startDate": currUnixTime - Util.daysInSeconds(7),
                    "endDate": currUnixTime,
                    "channels": [ruleEngineChannel]
                }
                console.log("ESAF INIT BODY:", esaf_body);
                let response = await Api.asyncAxiosCall(Url.esafURL, esaf_body, socket);
                socket.destroy();
                if (response && (response.numberofRecordsFound && response.numberofRecordsFound > 0)) {
                    console.log("Completed first ESAF request for rule engine!", " Response Record NID: ", response.numberofRecordsFound);
                    console.log(" Received valid data for first ESAF request...", "ESAF INIT Response: ", response)
                    const nid = { nid: response.responseRecord[0].nid || null, birthDate: response.responseRecord[0].birthDate || null,unifiedViewerBase : true }
                    return nid;
                }
                return { nid: null }
            });
    }, { priority: ESAF_PRIORITY });

    const factParams = { fact: 'ESAF_API', engine: engine, nidPriority: NID_PRIORITY, rules: rule_nid, body: body }
    nidDrivingPassportFacts.addNidDrivingPassportFacts(factParams);


    engine.addRule(rule_nid);
    await engine.run(body);
    console.log("finished");
}

module.exports = {
    unifiedNidRule
};
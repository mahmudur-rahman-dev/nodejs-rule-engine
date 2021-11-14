'use strict'

const {
    Engine
} = require('json-rules-engine');
const Api = require('../api');
const Url = require('../constants/backend_url');
const Util = require('../util/util');
const requestBody = require('../constants/request_body_generator');
const EmptyBodies = require('../constants/response_bodies');
const Redis = require('../util/redis')
const MnoOperators = require('../constants/mno')
const RequestTypes = require('../constants/request_type');
const moment = require('moment');

const {
    socketSyncInit, destroySocket
} = require('../socket_client/service');
const addFact = require('../facts/nid_esaf_facts');


/**
 * Initiate Driving License discovery rule
 * @param {*} body Body must be JSON require to hit query service api for Driving License
 */
async function drivingLicenseRuleForDiscovery(body) {

    const engine = new Engine();

    const DRIVING_LICENSE_PRIORITY = 100;
    const NID_PRIORITY = 50;
    const ESAF_PRIORITY = 40;
    
    const ruleEngineChannel = "rule_engine_" + body.channels[0];
    let socket = await socketSyncInit(ruleEngineChannel);
    console.log("Socket Init Complete")
    
    // Rules
    /**
     * rules need to be satisfied to run rule engine
     */
    const ruleDrivingLicense = {
        conditions: {
            all: [{
                    fact: 'DRIVING_LICENSE_API',
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
            type: 'DRIVING_LICENSE_API_CALL'
        }
    };
    engine.addRule(ruleDrivingLicense);
    let keys = Object.keys(body);

    engine
        .on('success', event => {
            destroySocket(socket);
            console.log(event);
        })
        .on('failure', event => {
            destroySocket(socket);
            Redis.publishToChannels(EmptyBodies.json_empty_nid_body, body.channels);
            for(let op of MnoOperators.operators) {
                let esaf_body = EmptyBodies.json_empty_esaf_body;
                esaf_body['operator'] = op;
                Redis.publishToChannels(esaf_body, body.channels);
            }
            console.log("FAIL")
        });

    // const ruleEngineChannel = "rule_engine_" + body.channels[0];
    // let socket = await socketSyncInit(ruleEngineChannel);
    // console.log("Socket Init Complete")
    

    /**
     * a post call is made to query service with dubBody 
     * dubBody is required for added socket channel and some required field
     * This Fact need to wait for response to socket channel of the post call
     * before the next fact is excuted
     */
    engine.addFact('DRIVING_LICENSE_API', (params, almanac) => {
        return almanac.factValue(keys[0])
            .then(async () => {
                let dubChannel = [...body.channels,ruleEngineChannel];
                let dubBody = {
                    "userId": body.userId || null,
                    "caseId": body.caseId || null,
                    "agencyId" : body.agencyId || null,
                    "searchMode" : body.searchMode || null,
                    "parameterType": body.parameterType,
                    "parameterValue": body.parameterValue,
                    "channels": [...dubChannel],
                    "discoveryId": body.discoveryId
                };
                const drivingLicense = await Api.asyncAxiosCall(Url.drivingLicenseURL, dubBody, socket);
                try {
                    let nidNumber = drivingLicense.drivingLicenseRecord[0].nid;
                    let dob = Util.timeStampToData(drivingLicense.drivingLicenseRecord[0].dateOfBirth);
                    console.log("Driving License: ", body.parameterValue, "NID Number: ", nidNumber);
                    return requestBody.getNidRequestBody(nidNumber, dob, dubBody);
                } catch (error) {
                    return { nidNumber: "0"};
                }
            });
    }, { priority: DRIVING_LICENSE_PRIORITY });

    /**
     *  a post call is made to query service with nidBody 
     * which was send from previous Fact
     * This Fact need to wait for response to socket channel of the post call
     * before the next fact is excuted.
     */
    engine.addFact('NID_API', (params, almanac) => {
        return almanac.factValue('DRIVING_LICENSE_API')
            .then(async (nidBody) => {
                console.log("IN : NID_API || NID_ESAF_FACTS")
                const nid = await Api.asyncAxiosCall(Url.nidURL, nidBody, socket);
                // if (!nid) return false;
                console.log("NID Number - ", nid);
                const nids = (nid && nid.hasOwnProperty("nid10Digit")) ? {"nids" : [nid.nid10Digit, nid.nid17Digit] ,"channels": nidBody.channels} : {"nids" : [] ,"channels": []};
                console.log("NID Number - ", nids);
                return nids;

            });
    }, { priority: NID_PRIORITY });

    /**
     * a post call is made to query service with nidBody 
     * which was send from previous Fact
     * This Fact need to wait for response to socket channel of the post call
     * before the next fact is excuted.
     */
    engine.addFact('ESAF_API', (params, almanac) => {
        return almanac.factValue('NID_API')
            .then((newbody) => {
                console.log("IN : NID_API || NID_ESAF_FACTS || With NIDS",newbody.nids);
                newbody.nids.forEach(nid => {
                    const currUnixTime = Math.floor(new Date().getTime() / 1000)  - Util.daysInSeconds(1);
                    console.log("nid is : ", nid);
                    let dubBody = {
                        "userId": body.userId || null,
                        "caseId": body.caseId || null,
                        "agencyId" : body.agencyId || null,
                        "searchMode" : body.searchMode || null,
                        "requestType" : RequestTypes.RequestTypes.ESAF,
                        "searchCriteria" : 4,
                        "searchValue" : nid,
                        "startDate" : currUnixTime - Util.daysInSeconds(7),
                        "endDate" : currUnixTime,
                        "channels" : [...body.channels],
                        "discoveryId": body.discoveryId || null,
                        "unifiedViewerId": body.unifiedViewerId || null
                    };
                    Api.axiosCall(Url.esafURL, dubBody);
                })
                return true;
            });
    }, { priority: ESAF_PRIORITY });
    // addFact.addNidEsafFacts('DRIVING_LICENSE_API', socket, engine);
    await engine.run(body)
}

module.exports = {
    drivingLicenseRuleForDiscovery
};

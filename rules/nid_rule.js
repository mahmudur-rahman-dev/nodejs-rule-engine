'use strict'

const {
    Engine
} = require('json-rules-engine');
const Api = require('../api');
const Url = require('../constants/backend_url');
const Util = require('../util/util');
// const EmptyBodies = require('../constants/response_bodies');
// const Redis = require('../util/redis')
// const MnoOperators = require('../constants/mno')
const { onNidRuleChainFailure } = require('../services/rule_chain_failure_service');
const { getUnifiedViewerId } = require('../services/unified_viewer_creation_service');
const RequestTypes = require('../constants/request_type')

const {
    socket_init, socketSyncInit, destroySocket
} = require('../socket_client/service');

/**
 * Initiate NID discovery rule
 * @param {*} body 
 */
async function nidRuleForDiscovery(body) {
    const engine = new Engine();
    const UNIFIED_VIEWER_PRIORITY = 100;
    const NID_PRIORITY =UNIFIED_VIEWER_PRIORITY -10;
    const ESAF_PRIORITY = NID_PRIORITY -10;
    const PASSPORT_PRIORITY = NID_PRIORITY -10;
    const DRIVING_LICENSE_PRIORITY = NID_PRIORITY -10;

    // Rules
    const ruleNID = {
        conditions: {
            all: [
            {
                fact: 'UNIFIED_VIEWER_API',
                operator: 'greaterThanInclusive',
                value: 0,
            },
            {
                fact: 'NID_API',
                operator: 'greaterThanInclusive',
                value: 1,
                path: '$.length'
            },
            {
                fact: 'ESAF_API',
                operator: 'equal',
                value: true
            },
            {
                fact: 'PASSPORT_API',
                operator: 'equal',
                value: true
            },
            {
                fact: 'DRIVING_LICENSE_API',
                operator: 'equal',
                value: true
            }
            ]
        },
        event: {
            type: 'NID_API_CALL'
        }
    };

    engine.addRule(ruleNID);
    let keys = Object.keys(body);
    let nids;

    const bodyCopy = {...body, channels: [...body.channels]};
    const onFailure = onNidRuleChainFailure(bodyCopy);
    // Events
    engine
        .on('success', event => {
            console.log(event);
        })
        .on('failure', event => {
            // publish empty body for failure scenario
            // Redis.publishToChannels(EmptyBodies.json_empty_passport_body, body.channels);
            // Redis.publishToChannels(EmptyBodies.json_empty_driving_license_body, body.channels)
            
            // for(let op of MnoOperators.operators) {
            //     let esaf_body = EmptyBodies.json_empty_esaf_body;
            //     esaf_body['operator'] = op;
            //     Redis.publishToChannels(esaf_body, body.channels);
            // }
            onFailure();
            console.log("FAIL")
        });
    const ruleEngineChannel = "rule_engine_" + body.channels[0];
    let socket = await socketSyncInit(ruleEngineChannel);
    console.log("Socket Init Complete")
    
    /**
     * a post call is made to case management to retrieve or create unified id 
     * This Fact need to wait for response of the post call
     * before the next fact is excuted
     */
    engine.addFact('UNIFIED_VIEWER_API', (params, almanac) => {
        return almanac.factValue(keys[0])
            .then(async() => {
                const unifiedViewer = await getUnifiedViewerId(body);
                return unifiedViewer ? unifiedViewer.id : 0 ;
            });
    }, { priority: UNIFIED_VIEWER_PRIORITY});

       /**
     * a post call is made to query service with body 
     * This Fact need to wait for response to socket channel of the post call
     * before the next fact is excuted
     */
    engine.addFact('NID_API', (params, almanac) => {
        return almanac.factValue('UNIFIED_VIEWER_API')
            .then(async (unifiedViewerId) => {
                body.unifiedViewerId = unifiedViewerId == 0 ? null : unifiedViewerId;
                console.log("calling nid api")
                body.channels.push(ruleEngineChannel)
                let dubBody = JSON.parse(JSON.stringify(body));
                dubBody.unifiedViewerBase = true;
                dubBody.discoveryId = body.discoveryId
                dubBody.additionalSearchParams = {
                    "dob": body.dateOfBirth
                };
                const nid = await Api.asyncAxiosCall(Url.nidURL, dubBody, socket);
                destroySocket(socket);
                console.log("NID response - ", nid);
                const nids = nid && nid.hasOwnProperty('nid10Digit') && nid.hasOwnProperty('nid17Digit') ? [nid.nid10Digit, nid.nid13Digit, nid.nid17Digit] : [];
                console.log("NID Number - ", nids);
                return nids;
            });
    }, { priority: NID_PRIORITY });


    /**
     * a post call is made to query service with dubBody 
     * dubBody is required for added socket channel and some required field
     */
    engine.addFact('ESAF_API', (params, almanac) => {
        return almanac.factValue('NID_API')
            .then((nids) => {
                console.log("IN :ESAF_API || With  NIDS: " + nids);
                nids.forEach(nid => {
                    const currUnixTime = Math.floor(new Date().getTime() / 1000) - Util.daysInSeconds(1);
                    console.log("nid is : ", nid);
                    let dubBody = {
                        "userId": body.userId || null,
                        "caseId": body.caseId || null,
                        "agencyId" : body.agencyId || null,
                        "searchMode" : body.searchMode || null,
                        "requestType": RequestTypes.RequestTypes.ESAF,
                        "searchCriteria": 4,
                        "searchValue": nid,
                        "startDate": currUnixTime - Util.daysInSeconds(7),
                        "endDate": currUnixTime,
                        "channels": [...body.channels],
                        "discoveryId": body.discoveryId || null,
                        "unifiedViewerId": body.unifiedViewerId || null
                    }
                    Api.axiosCall(Url.esafURL, dubBody);
                })
                return true;
            });
    }, { priority: ESAF_PRIORITY });
        /**
     * a post call is made to query service with dubBody 
     * dubBody is required for added socket channel and some required field
     */
    engine.addFact('PASSPORT_API', (params, almanac) => {
        return almanac.factValue('NID_API')
            .then((nids) => {
                console.log("IN :PASSPORT_API || With  NIDS: " + nids);
                nids.forEach(nid => {
                    let dubBody = {
                        "userId": body.userId || null,
                        "caseId": body.caseId || null,
                        "agencyId" : body.agencyId || null,
                        "searchMode" : body.searchMode || null,
                        "parameterType": "NationalID",
                        "parameterValue": nid,
                        "channels": [...body.channels],
                        "discoveryId": body.discoveryId || null,
                        "unifiedViewerId": body.unifiedViewerId || null
                    }
                    console.log("Calling Passport Api with nid : ", dubBody);
                    Api.axiosCall(Url.passportURL, dubBody);
                })
                return true;
            });
    }, { priority: PASSPORT_PRIORITY });
    
        /**
     * a post call is made to query service with dubBody 
     * dubBody is required for added socket channel and some required field
     */
    engine.addFact('DRIVING_LICENSE_API', (params, almanac) => {
        return almanac.factValue('NID_API')
            .then((nids) => {
                console.log("IN :DRIVING_LICENSE_API || With  NIDS: " + nids);
                nids.forEach(nid => {
                    console.log("nid is : ", nid);
                    let dubBody = {
                        "userId": body.userId || null,
                        "caseId": body.caseId || null,
                        "agencyId" : body.agencyId || null,
                        "searchMode" : body.searchMode || null,
                        "parameterType": "nidNumber",
                        "parameterValue": nid,
                        "channels": [...body.channels],
                        "discoveryId": body.discoveryId || null,
                        "unifiedViewerId": body.unifiedViewerId || null
                    };
                    Api.axiosCall(Url.drivingLicenseURL, dubBody);
                })
                return true;
            });
    },  { priority: DRIVING_LICENSE_PRIORITY });

    await engine.run(body)
}

// start()
// nidRuleForDiscovery()
module.exports = {
    nidRuleForDiscovery
};

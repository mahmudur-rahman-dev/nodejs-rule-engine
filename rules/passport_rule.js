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
const { getUnifiedViewerId } = require('../services/unified_viewer_creation_service');
const moment = require('moment');
const {
    socket_init,socketSyncInit, destroySocket
} = require('../socket_client/service');

async function passportRuleForDiscovery(body) {
    const UNIFIED_VIEWER_PRIORITY = 100;
    const PASSPORT_PRIORITY = UNIFIED_VIEWER_PRIORITY - 10;
    const NID_PRIORITY = PASSPORT_PRIORITY -10;
    const ESAF_PRIORITY = NID_PRIORITY - 10;
    const engine = new Engine();
    
    const ruleEngineChannel = "rule_engine_" + body.channels[0];
    let socket = await socketSyncInit(ruleEngineChannel);
    console.log("Socket Init Complete")
    
    // Rules
    const rulePassport = {
        conditions: {
            all: [
                {
                    fact: 'UNIFIED_VIEWER_API',
                    operator: 'greaterThanInclusive',
                    value: 0,
                },
                {
                fact: 'PASSPORT_API',
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
            type: 'PASSPORT_API_CALL'
        }
    };
    engine.addRule(rulePassport);
    let keys = Object.keys(body);

    engine
        .on('success', event => {
            destroySocket(socket);
            console.log(event);
        })
        .on('failure', event => {
            destroySocket(socket);
            Redis.publishToChannels(EmptyBodies.json_empty_nid_body, body.channels)
            Redis.publishToChannels(EmptyBodies.json_empty_esaf_body, body.channels)
            console.log("FAIL")
        });
    // const ruleEngineChannel = "rule_engine_" + body.channels[0];
    // let socket = await socketSyncInit(ruleEngineChannel);
    // console.log("Socket Init Complete")
    
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
    engine.addFact('PASSPORT_API', (params, almanac) => {
            return almanac.factValue('UNIFIED_VIEWER_API')
                .then(async (unifiedViewerId) => {
                    body.unifiedViewerId = unifiedViewerId;
                    let dubChannel = [...body.channels,ruleEngineChannel];
                    let dubBody = {
                        "userId": body.userId || null,
                        "caseId": body.caseId || null,
                        "agencyId" : body.agencyId || null,
                        "searchMode" : body.searchMode || null,
                        "unifiedViewerBase" : true,
                        "parameterType": body.parameterType,
                        "parameterValue": body.parameterValue,
                        "channels": [...dubChannel],
                        "discoveryId": body.discoveryId || null,
                        "unifiedViewerId": unifiedViewerId || null
                    };
                    console.log("Calling Passport Api")
                    const passport = await Api.asyncAxiosCall(Url.passportURL, dubBody, socket);
                    try {
                        const nidNumber = passport.passportRecords[0].nationalID;
                        const dob = new Date(passport.passportRecords[0].dob);
                        const dateOfBirth = moment(dob).format("YYYY-MM-DD")
                        console.log("PassportNO: ", body.parameterValue, "Received NID Number: ",nidNumber, "DOB: ",dateOfBirth);
                        return requestBody.getNidRequestBody(nidNumber,dateOfBirth,dubBody);
                    } catch (error) {
                        return { nidNumber: "0"};;
                    }

                });
        }, { priority: PASSPORT_PRIORITY }
    );
    
           /**
     * a post call is made to query service with body 
     * This Fact need to wait for response to socket channel of the post call
     * before the next fact is excuted
     */
    engine.addFact('NID_API', (params, almanac) => {
        return almanac.factValue('PASSPORT_API')
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
     * a post call is made to query service with dubBody 
     * dubBody is required for added socket channel and some required field
     */
    engine.addFact('ESAF_API', (params, almanac) => {
        return almanac.factValue('NID_API')

            .then((newbody) => {
                console.log("IN : NID_API || NID_ESAF_FACTS || With NIDS",body.nids);
                newbody.nids.forEach(nid => {
                    const currUnixTime = Math.floor(new Date().getTime() / 1000)  - Util.daysInSeconds(1);
                    console.log("nid is : ", nid);
                    let dubBody = {
                        "userId": body.userId || null,
                        "caseId": body.caseId || null,
                        "agencyId" : body.agencyId || null,
                        "searchMode" : body.searchMode || null,
                        "requestType": RequestTypes.RequestTypes.ESAF,
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

   await engine.run(body)
 

}

module.exports = {
    passportRuleForDiscovery
};

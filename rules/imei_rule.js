'use strict'

const {
    Engine
} = require('json-rules-engine');
const Api = require('../api');
const Url = require('../constants/backend_url');
const Util = require('../util/util');
const EmptyBodies = require('../constants/response_bodies');
const Redis = require('../util/redis')
const RequestTypes = require('../constants/request_type')
const SelectionCriterias = require('../constants/selection_criterias')
const moment = require('moment');
const {
    socket_init,socketSyncInit, destroySocket
} = require('../socket_client/service');

const requestBody = require('../constants/request_body_generator');
const {
    each
} = require('lodash');
/**
 * Initiate IMEI discovery rule
 * @param {*} body 
 */
async function imeiRuleForDiscovery(body) {

    const engine = new Engine();
    const ESAF_PRIORITY = 90;
    const LRL_PRIORITY = 90;
    const NID_PRIORITY = 80;
    const DEVICE_INFO_PRIORITY = 90;


    // Rules
    /**
     * rules need to be satisfied to run rule engine
     */
    const ruleIMEI = {
        conditions: {
            all: [{
                    fact: 'ESAF_API',
                    operator: 'greaterThanInclusive',
                    value: 10,
                    path: '$.nidNumber.length'
                },
                {
                    fact: 'LRL_API',
                    operator: 'equal',
                    value: true
                },
                {
                    fact: 'NID_API',
                    // operator: 'greaterThanInclusive',
                    // value: 1,
                    // path: '$.length'
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
            type: 'IMEI_API_CALL'
        }
    };
    engine.addRule(ruleIMEI);
    let keys = Object.keys(body);
    engine
        .on('success', event => {
            console.log(event);
        })
        .on('failure', event => {
            Redis.publishToChannels(EmptyBodies.json_empty_nid_body, body.channels)
            console.log("FAIL")
        });

    const ruleEngineChannel = "rule_engine_" + body.channels[0]+"_"+Util.create_UUID();
    let socket = await socketSyncInit(ruleEngineChannel);
    console.log("Socket Init Complete")


    /**
     * a post call is made to query service with dubBody 
     * dubBody is required for added socket channel and some required field
     * This Fact need to wait for response to socket channel of the post call
     * before the next fact is excuted
     */
    engine.addFact('ESAF_API', (params, almanac) => {
        return almanac.factValue(keys[0])
            .then(async () => {
                let dubChannels= body.channels;
                dubChannels.push(ruleEngineChannel);
                let dubBody = {
                    "userId": body.userId || null,
                    "caseId": body.caseId || null,
                    "agencyId" : body.agencyId || null,
                    "searchMode" : body.searchMode || null,
                    "searchValue": body.searchValue,
                    "startDate": body.startDate,
                    "endDate": body.endDate,
                    "requestType": RequestTypes.RequestTypes.ESAF,
                    "searchCriteria": 1,
                    "channels": [...dubChannels],
                    "discoveryId": body.discoveryId || null,
                    "unifiedViewerId": body.unifiedViewerId || null
                }
                console.log(dubBody)
                const esaf = await Api.asyncAxiosCall(Url.esafURL, dubBody, socket);
                destroySocket(socket);
                try {
                    let dob = moment(esaf.responseRecord[0].birthDate).format("YYYY-MM-DD");
                    let nidbody = requestBody.getNidRequestBody(esaf.responseRecord[0].nid,dob,dubBody);
                    
                    console.log("Esaf found for Imei with request body: " + dubBody + " Esaf response for IMEI: " + esaf);
                    return nidbody;
                } catch (error) {
                    console.log("Esaf not found for Imei with request body: " + dubBody);
                    console.log("Esaf response for Imei rule. Body: " + dubBody + " Esaf response for Imei: " + esaf);
                    return { nidNumber: ""};
                }
            });
    }, {
        priority: ESAF_PRIORITY
    });
    /**
     *  a post call is made to query service with nidBody 
     * which was send from previous Fact
     */
    engine.addFact('NID_API', (params, almanac) => {
        return almanac.factValue('ESAF_API')
            .then((nidbody) => {
                console.log("calling nid api")
                console.log("NID body :",nidbody)
                Api.axiosCall(Url.nidURL, nidbody);
                return true;
            });
    }, {
        priority: NID_PRIORITY
    });

    /**
     * a post call is made to spring Backend with dubBody 
     * dubBody is required for added socket channel and some required field
     */
    engine.addFact('LRL_API', (params, almanac) => {
        return almanac.factValue(keys[0])
            .then(() => {
                let dubBody = {
                    "userId": body.userId || null,
                    "caseId": body.caseId || null,
                    "agencyId" : body.agencyId || null,
                    "searchMode" : body.searchMode || null,
                    "msisdn": body.searchValue,
                    "startDate": body.startDate,
                    "endDate": body.endDate,
                    "requestData": RequestTypes.RequestTypes.LRL,
                    "selectionCriteria": SelectionCriterias.SelectionCriterias.MSISDN,
                    "channels": [...body.channels],
                    "discoveryId": body.discoveryId || null,
                    "unifiedViewerId": body.unifiedViewerId || null
                };
                Api.axiosCall(Url.mnoURL, dubBody);
                return true;
            });
    }, {
        priority: LRL_PRIORITY
    });


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
                    "searchCriteria":  SelectionCriterias.SelectionCriterias.IMEI,
                    "searchValue": body.searchValue
                    
                }
                let url = Url.deviceInfoUrl
                console.log("device-info url: "+ url+"   device-info API BODY:", device_info_body);
                Api.axiosCall(url, device_info_body);
                return true;
            });
    }, { priority: DEVICE_INFO_PRIORITY });


    await engine.run(body);
}


module.exports = {
    imeiRuleForDiscovery
};
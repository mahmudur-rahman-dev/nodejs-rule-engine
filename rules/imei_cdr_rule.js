'use strict'

const {
    Engine
} = require('json-rules-engine');

const Api = require('../api');
const ApiImeiCDR = require('../api_imei_cdr');
const Url = require('../constants/backend_url');
const Util = require('../util/util');
const requestBody = require('../constants/request_body_generator');
const addFact = require('../facts/nid_esaf_facts');
const RequestTypes = require('../constants/request_type')

const {
    socket_init,socketSyncInit
} = require('../socket_client/service');


/**
 * Initiate CDR rule to extract number imei discovery rule
 * @param {*} body Body must be JSON require to hit query service api for Birth Registration 
 */
async function imeiCRDRuleForDiscovery(body) {
    const engine = new Engine();
    // Rules
    /**
     * rules need to be satisfied to run rule engine
     */
    const ruleIMEICDR = {
        conditions: {
            all: [{
                fact: 'IMEI_CDR_API',
                operator: 'equal',
                value: true,

            }]
        },
        event: {
            type: 'IMEI_CDR_API'
        }
    };
    engine.addRule(ruleIMEICDR);
    let keys = Object.keys(body);

    engine
        .on('success', event => {
            console.log(event);
        })
        .on('failure', event => {
            console.log("FAIL")
        });
    const ruleEngineChannel = "rule_engine_" + body.channels[0] + "IMEI_CRD";
    let socket = await socketSyncInit(ruleEngineChannel);
    console.log("Socket Init Complete")

    /**
     * A post call is made to query service with dubBody to recieve unique phone number
     * to call imei discovery rule
     * This Fact need to wait for response to socket channel of the post call
     * before the next fact is excuted.
     */
    engine.addFact('IMEI_CDR_API', (params, almanac) => {
        return almanac.factValue(keys[0])
            .then(() => {
                let dubChannels = [...body.channels,ruleEngineChannel];
                let dubBody = {
                    "userId": body.userId || null,
                    "caseId": body.caseId || null,
                    "agencyId" : body.agencyId || null,
                    "searchMode" : body.searchMode || null,
                    "requestType": RequestTypes.RequestTypes.CDR,
                    "searchCriteria": body.searchCriteria,
                    "searchValue": body.searchValue,
                    "startDate": body.startDate,
                    "endDate": body.endDate,
                    "channels": [...dubChannels],
                    "discoveryId": body.discoveryId || null,
                    "unifiedViewerId": body.unifiedViewerId || null
                }
                ApiImeiCDR.axiosIMEICDRCall(Url.cdrURL, dubBody, socket)
                return true
            });
    });


    await engine.run(body)

}

module.exports = {
    imeiCRDRuleForDiscovery
};
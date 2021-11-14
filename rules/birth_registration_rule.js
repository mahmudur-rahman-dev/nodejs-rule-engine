'use strict'

const {
    Engine
} = require('json-rules-engine');
const Api = require('../api');
const Url = require('../constants/backend_url');
const Util = require('../util/util');
const requestBody = require('../constants/request_body_generator');
const {
    socket_init,socketSyncInit
} = require('../socket_client/service');

/**
 * Initiate Birth Registration discovery rule
 * @param {*} body Body must be JSON require to hit query service api for Birth Registration
 */
async function birthRegistrationRuleForDiscovery(body) {

    const engine = new Engine();
    const BIRTH_REGISTRATION_PRIORITY = 100;
    /**
     * rules need to be satisfied to run rule engine
     */
    const ruleBirthRegistration = {
        conditions: {
            all: [{
                fact: 'BIRTH_REGISTRATION_API',
                operator: 'equal',
                value: true
            }]
        },
        event: {
            type: 'BIRTH_REGISTRATION_API_CALL'
        }
    };
    engine.addRule(ruleBirthRegistration);
    let keys = Object.keys(body);

    engine
        .on('success', event => {
            console.log(event);
        })
        .on('failure', event => {
            console.log("FAIL")
        });
    const ruleEngineChannel = "rule_engine_" + body.channels[0];
    let socket = await socketSyncInit(ruleEngineChannel);
    console.log("Socket Init Complete")

    /**
     * a post call is made to query service with dubBody 
     * dubBody is required for added socket channel and some required field
     */
    engine.addFact('BIRTH_REGISTRATION_API', (params, almanac) => {
        return almanac.factValue(keys[0])
            .then(async () => {
                let dubChannel = [...body.channels];
                dubChannel.push(ruleEngineChannel);
                let dubBody = {
                    "userId": body.userId || null,
                    "caseId": body.caseId || null,
                    "agencyId" : body.agencyId || null,
                    "searchMode" : body.searchMode || null,
                    "birthRegNo": body.birthRegNo,
                    "birthDate": body.birthDate,
                    "channels": [...dubChannel],
                    "discoveryId": body.discoveryId || null,
                    "unifiedViewerId": body.unifiedViewerId || null
                };
                console.log("Birth Registration Request Body:",dubBody);
                Api.axiosCall(Url.birthRegistrationURL, dubBody);
                return true;
            });
    }, { priority: BIRTH_REGISTRATION_PRIORITY });
    await engine.run(body)
}
module.exports = {
    birthRegistrationRuleForDiscovery
};
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
 * Initiate NID and DOB unified rule
 * @param {*} body 
 */
async function unifiedNidRule(body) {
    const engine = new Engine();


    const NID_PRIORITY = 90;
    // Rules
    const rule_nid = {
        conditions: {
            all: [
                {
                    fact: 'NID_API',
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

    // const ruleEngineChannel = "rule_engine_" + body.channels[0];
    // let socket = await socketSyncInit(ruleEngineChannel);
    // console.log("Socket Init Complete")

    engine.addFact('NID_API', (params, almanac) => {
        return almanac.factValue(keys[0])
            .then(async () => {
                const additionalSearchParams = {
                    "dob": body.dateOfBirth
                };
               return { nid: body.searchValue || null, birthDate: body.dateOfBirth || null ,unifiedViewerBase : true,
                additionalSearchParams}
            });
    }, { priority: NID_PRIORITY });

    
    const factParams = { fact: 'NID_API',engine: engine, nidPriority: NID_PRIORITY-10, rules: rule_nid,  body:body }
    nidDrivingPassportFacts.addNidDrivingPassportFacts(factParams);

    
    engine.addRule(rule_nid);
    await engine.run(body)
}

module.exports = {
    unifiedNidRule
};
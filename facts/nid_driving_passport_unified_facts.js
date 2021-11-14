const {
    Fact
} = require("json-rules-engine");
const Api = require('../api');
const Url = require('../constants/backend_url');
const { socket_init, socketSyncInit } = require('../socket_client/service');
const Util = require('../util/util');
const addNidDrivingPassportFacts = function (factParams) {

    const NID_PRIORITY = factParams.nidPriority;
    const DRIVING_LICENSE_PRIORITY = NID_PRIORITY - 10
    const PASSPORT_PRIORITY = NID_PRIORITY - 10
    const rule_nid = [
        {
            fact: 'NID_FACT',
            operator: 'greaterThanInclusive',
            value: 1,
            path: '$.length'
        },
        {
            fact: 'DRIVING_LICENSE_FACT',
            operator: 'equal',
            value: true
        }
        ,
        {
            fact: 'PASSPORT_FACT',
            operator: 'equal',
            value: true
        }
    ]
    factParams.rules.conditions.all.push(...rule_nid)

    let nidFact = new Fact('NID_FACT', (params, almanac) => {
        return almanac.factValue(factParams.fact)
            .then(async (nid) => {
                const ruleEngineChannel = `${factParams.body.channels[0]}_${Util.create_UUID()}_NIDFACT"`
                let socket = await socketSyncInit(ruleEngineChannel);
                console.log("Socket Init Complete for NID fact")

                let nid_body = {
                    "userId": factParams.body.userId || null,
                    "caseId": factParams.body.caseId || null,
                    "agencyId": factParams.body.agencyId || null,
                    "discoveryId": factParams.body.discoveryId || null,
                    "unifiedViewerId": factParams.body.unifiedViewerId || null,
                    "searchMode": factParams.body.searchMode || null,
                    "nidNumber": nid.nid,
                    "dateOfBirth": nid.birthDate,
                    "channels": [...factParams.body.channels,ruleEngineChannel]
                }
                
                console.log("NID API BODY:", nid_body);
                let response = await Api.asyncAxiosCall(Url.nidURL, nid_body,socket);
                socket.destroy();
                if (response && response.hasOwnProperty('nid10Digit')) {
                    let nids = [response.nid10Digit, response.nid13Digit, response.nid17Digit];
                    console.log(`Received valid data for NID request: ${nids}`)
                    
                    return nids;
                }
                return [];
            });
    }, { priority: NID_PRIORITY });
    factParams.engine.addFact(nidFact);

    let drivingLicenseFact = new Fact('DRIVING_LICENSE_FACT', (params, almanac) => {
        return almanac.factValue('NID_FACT')
            .then((nids) => {
                let dubBody = {
                    "userId": factParams.body.userId || null,
                    "caseId": factParams.body.caseId || null,
                    "agencyId": factParams.body.agencyId || null,
                    "discoveryId": factParams.body.discoveryId || null,
                    "unifiedViewerId": factParams.body.unifiedViewerId || null,
                    "searchMode": factParams.body.searchMode || null,
                    "parameterType": "nidNumber",
                    "parameterValue": factParams.body.searchValue,
                    "channels": factParams.body.channels
                };
                dubBody.parameterType = "nidNumber"
                nids.forEach(nid => {
                    dubBody.parameterValue = nid
                    console.log("Calling DRIVING LICENSE with Body :", dubBody);
                    Api.axiosCall(Url.drivingLicenseURL, dubBody);
                });
                console.log("Completed DRIVING LICENSE request for rule engine");
                return true;
            });
    }, { priority: DRIVING_LICENSE_PRIORITY });
    factParams.engine.addFact(drivingLicenseFact);

    let passportFact = new Fact('PASSPORT_FACT', (params, almanac) => {
        return almanac.factValue('NID_FACT')
            .then((nids) => {
                let dubBody = {
                    "userId": factParams.body.userId || null,
                    "caseId": factParams.body.caseId || null,
                    "agencyId": factParams.body.agencyId || null,
                    "discoveryId": factParams.body.discoveryId || null,
                    "unifiedViewerId": factParams.body.unifiedViewerId || null,
                    "searchMode": factParams.body.searchMode || null,
                    "parameterType": "NationalID",
                    "parameterValue": "",
                    "channels": [...factParams.body.channels]
                };
                console.log("Calling Passport Api")
                nids.forEach(nid => {
                    dubBody.parameterValue = nid
                    console.log("Calling PASSPORT with Body :", dubBody);
                    Api.axiosCall(Url.passportURL, dubBody);
                });

                return true
            });
    }, { priority: PASSPORT_PRIORITY });
    factParams.engine.addFact(passportFact)
};

module.exports = {
    addNidDrivingPassportFacts
};
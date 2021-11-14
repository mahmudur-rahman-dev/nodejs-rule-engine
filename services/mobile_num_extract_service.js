const axios = require('axios');
const Url = require('../constants/backend_url');
const unifiedImeiImsiRRule = require("../rules/unified_imei_imsi_rules");
const RequestTypes = require('../constants/request_type')
const Util = require('../util/util');
const { socket_init, socketSyncInit } = require('../socket_client/service');

/**
 * 
 * @param {*} body 
 * @returns 
 */
async function extractMobileNum(body) {
    const url = Url.cdrURL
    const ruleEngineChannel = "rule_engine_" + body.channels[0] + "_NUMBER_EXTRACTER";
    const currUnixTime = Math.floor(new Date().getTime() / 1000) - Util.daysInSeconds(1);
    let dubBody = {
        "userId": body.userId || null,
        "caseId": body.caseId || null,
        "agencyId": body.agencyId || null,
        "searchMode": body.searchMode || null,
        "requestType": RequestTypes.RequestTypes.CDR,
        "searchCriteria": body.searchCriteria,
        "searchValue": body.searchValue,
        "startDate": currUnixTime - Util.daysInSeconds(7),
        "endDate": currUnixTime,
        "channels": [ruleEngineChannel]
    }
  
    let socket = await socketSyncInit(ruleEngineChannel);
    console.log("Socket Init Complete")

    
    let result = new Promise(function (accept, reject) {
        let count = 0
        
        socket.on(ruleEngineChannel, res => {
            count++;
            let result = JSON.parse(JSON.parse(res));
            let uniquePartyA = new Set();
            try {
                result.data.responseRecord.forEach(call => {
                    uniquePartyA.add(call.partyA)
                });
                console.log("Unique Party A:", uniquePartyA, "Operator: ", result.data.operator)
                uniquePartyA.forEach(number => {
                    let newBody = {
                        "userId": body.userId || null,
                        "caseId": body.caseId || null,
                        "agencyId": body.agencyId || null,
                        "discoveryId": body.discoveryId || null,
                        "unifiedViewerId": body.unifiedViewerId || null,
                        "searchMode": body.searchMode || null,
                        "searchValue": number,
                        "channels": [...body.channels]
                    }
                    unifiedImeiImsiRRule.unifiedImeiImsiRRule(newBody)
                });

            } catch (TypeError) {
                console.log("DATA NOT FOUND FOR IMEI")
            }
            if (count == 4) {
                console.log("Number Number Extraction Complete")
                accept();
            }
        });
    });

    console.log("Posting MNO with body:", dubBody, "URL:", url)
    axios.post(url, dubBody);
    return await result;
}

module.exports = {
    extractMobileNum
};
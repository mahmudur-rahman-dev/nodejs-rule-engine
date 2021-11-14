const axios = require('axios');
const RequestTypes = require('./constants/request_type')
const Util = require('./util/util');
const Api = require('./api');
const Url = require('./constants/backend_url');
const { socket_init, socketSyncInit } = require('./socket_client/service');

function getEsafBody(body,searchValue){
    const currUnixTime = Math.floor(new Date().getTime() / 1000)  - Util.daysInSeconds(1);
    let dubBody = {
        "userId": body.userId || null,
        "caseId": body.caseId || null,
        "agencyId": body.agencyId || null,
        "searchMode": body.searchMode || null,
        "discoveryId": body.discoveryId || null,
        "unifiedViewerId": body.unifiedViewerId || null,
        "requestType": RequestTypes.RequestTypes.ESAF,
        "searchCriteria": 4,
        "searchValue": searchValue,
        "startDate": currUnixTime - Util.daysInSeconds(7),
        "endDate": currUnixTime,
        "channels": [...body.channels]
    }
    return dubBody

}

function getDrivingLicenseBody(body,searchValue){
    let dubBody = {
        "userId": body.userId || null,
        "caseId": body.caseId || null,
        "agencyId": body.agencyId || null,
        "searchMode": body.searchMode || null,
        "discoveryId": body.discoveryId || null,
        "unifiedViewerId": body.unifiedViewerId || null,
        "parameterType": "mobileNumber",
        "parameterValue": searchValue,
        "channels": body.channels
    }
    return dubBody
}

async function  axiosEsafNumCall(nids,body) {
    
    return await new Promise(async function (accept, reject) {
        let count = 0
        let url = Url.esafURL
        const ruleEngineChannel = `${body.channels[0]}_${Util.create_UUID()}_NumExtraction`
        let socket = await socketSyncInit(ruleEngineChannel);
        console.log("Socket Init Complete for Number Extraction fact")
        let dubBody = JSON.parse(JSON.stringify(body))
        dubBody.channels.push(ruleEngineChannel)


        socket.on(ruleEngineChannel, res => {
            count++;
            let result = JSON.parse(JSON.parse(res));
            let uniquePartyA = new Set();
            try {
                result.data.responseRecord.forEach(esaf => {
                    uniquePartyA.add(esaf.phone)
                });

                console.log("Unique phone:", uniquePartyA, "Operator: ", result.data.operator)
                uniquePartyA.forEach((msisdn) => {
                    let drivingLicenseBody = getDrivingLicenseBody(body,msisdn)
                    Api.axiosCall(Url.drivingLicenseURL,drivingLicenseBody)
                })
            } catch (TypeError) {
                console.log("DATA NOT FOUND ERROR")
            }
            if (count == 12) {
                console.log("Number Extraction Complete")
                accept(socket);
            }
        });
        
        nids.forEach(nid => {
            let esafBody = getEsafBody(dubBody,nid)
            console.log("Posting To Esaf for Number Extraction with body:", esafBody, "URL:", url)
            axios.post(url, esafBody);
        });
        

    }).then((socket) => {socket.destroy()}).catch((error) => {
        console.log("error while extracting esaf from nids with body: " + body);
        console.log("Error: " + error);
    });

}

module.exports = {
    axiosEsafNumCall
};
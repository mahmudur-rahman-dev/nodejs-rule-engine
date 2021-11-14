const axios = require('axios');
const e = require('express');
const imeiRule = require("./rules/imei_rule");
/**
 * 
 * @param {string} url 
 * @param {*} body 
 * @param {socket} socket 
 * @returns 
 */
async function  axiosIMEICDRCall(url, body, socket) {
    console.log("Posting with body:", body, "URL:", url)
   
    let result = new Promise(function (accept, reject) {
        let count = 0
        socket.on(body.channels[body.channels.length - 1], res => {
            count++;
            let result = JSON.parse(JSON.parse(res));
            let uniquePartyA = new Set();
            try {
                result.data.responseRecord.forEach(call => {
                    uniquePartyA.add(call.partyA)
                });

                console.log("Unique Party A:", uniquePartyA, "Operator: ", result.data.operator)
                uniquePartyA.forEach((msisdn) => {
                    let dubBody = {
                        "searchValue": msisdn,
                        "startDate": body.startDate,
                        "endDate": body.endDate,
                        "channels": body.channels.slice(0,body.channels.length - 1)
                    };
                    imeiRule.imeiRuleForDiscovery(dubBody);
                })


            } catch (TypeError) {
                console.log("DATA NOT FOUND FOR IMEI")
            }
            if (count == 4) {
                accept(socket);
            }
        });
    }).then((socket)=>{socket.destroy()});
    axios.post(url, body);
    return await result;
}

module.exports = {
    axiosIMEICDRCall
};
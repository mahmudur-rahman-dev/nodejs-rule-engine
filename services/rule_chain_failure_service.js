// const EmptyBodies = require('../constants/response_bodies');
// const Redis = require('../util/redis')
// const MnoOperators = require('../constants/mno')
const EmptyBodies = require('../constants/response_bodies');
const Redis = require('../util/redis')
const MnoOperators = require('../constants/mno')
/**
 * 
 * @param {*} body 
 * @returns 
 */
function onNidRuleChainFailure(body) {
    const nids = [10, 13, 17];

    return function onFailure() {
        nids.forEach(digit => {
            let passportEmptyBody = EmptyBodies.json_empty_passport_body;
            let dlEmptyBody = EmptyBodies.json_empty_driving_license_body;
            let searchedWith = null;
            let nidDigit = 0;

            if(body.nidNumber && body.nidNumber.length == digit) {
                searchedWith = body.nidNumber;
            }
            
            nidDigit = digit;
            passportEmptyBody.nidDigit = nidDigit;
            passportEmptyBody.searchedWith = searchedWith;
            dlEmptyBody.nidDigit = nidDigit;
            dlEmptyBody.searchedWith = searchedWith;

            // publish empty body for failure scenario
            Redis.publishToChannels(passportEmptyBody, body.channels);
            Redis.publishToChannels(dlEmptyBody, body.channels);
            
        });

        //publish empty result for esaf
        // for(let op of MnoOperators.operators) {
        //     let esaf_body = EmptyBodies.json_empty_esaf_body;
        //     esaf_body['operator'] = op;
        //     esaf_body['searchedWith'] = body.searchedWith;
        //     Redis.publishToChannels(esaf_body, body.channels);
        // }
        publishEsafForAllOperator(body, body.searchedWith)
    };
}


function onVehicleRuleFailure(listOfBodies, requestBody, searchedWidth){
    console.log("body called by--", requestBody)
    console.log("searched with: ", searchedWidth)
    listOfBodies.forEach(function (responseBody, index){
    //   console.log(index, " ", responseBody)
      if ((index==0) ){
        const nids = [10, 13, 17];
        nids.forEach(digit => {
            publishEsafForAllOperator(requestBody, searchedWidth)
        })
        
      } else{
        Redis.publishToChannels(responseBody, requestBody.channels);
      }
    })
}

function publishEsafForAllOperator(requestBody, searchedWidth){
    
    for(let op of MnoOperators.operators) {
        let esaf_body = EmptyBodies.json_empty_esaf_body;
        esaf_body['operator'] = op;
        esaf_body['searchedWith'] = searchedWidth
        // console.log("esaf body to be published: ",esaf_body)
        Redis.publishToChannels(esaf_body, requestBody.channels);
    }
}

module.exports.onNidRuleChainFailure = onNidRuleChainFailure;
module.exports.onVehicleRuleFailure = onVehicleRuleFailure;
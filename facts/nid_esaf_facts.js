const {
    Fact
} = require("json-rules-engine");
const Util = require('../util/util');
const Api = require('../api');
const Constants = require('../constants/backend_url');

const ruleNID = {
    conditions: {
        all: [{
            fact: 'NID_API',
            operator: 'greaterThanInclusive',
            value: 10,
            path: '$.nids[0].length'
        },
        {
            fact: 'ESAF_API',
            operator: 'equal',
            value: true
        }

    ]
    },
    event: {
        type: 'NID_API_CALL'
    }
};

const addNidEsafFacts = function (fact, socket, engine) {
    
    const NID_PRIORITY = 50;
    const ESAF_PRIORITY = 40;

    engine.addRule(ruleNID);

    let nidFact = new Fact('NID_API', (params, almanac) => {
        return almanac.factValue(fact)
            .then(async (nidBody) => {
                console.log("IN : NID_API || NID_ESAF_FACTS")
                const nid = await Api.asyncAxiosCall(Constants.nidURL, nidBody, socket);
                // if (!nid) return false;
                console.log("NID Number - ", nid);
                const nids = (nid && nid.hasOwnProperty("nid10Digit")) ? {"nids" : [nid.nid10Digit, nid.nid17Digit] ,"channels": [...nidBody.channels]} : {"nids" : [] ,"channels": []};
                console.log("NID Number - ", nids);
                return nids;

            });
    }, { priority: NID_PRIORITY });
    engine.addFact(nidFact);

    let esafFact = new Fact('ESAF_API', (params, almanac) => {
        return almanac.factValue('NID_API')
            .then((body) => {
                console.log("IN : NID_API || NID_ESAF_FACTS || With NIDS",body.nids);
                body.nids.forEach(nid => {
                    const currUnixTime = Math.floor(new Date().getTime() / 1000)  - Util.daysInSeconds(1);
                    console.log("nid is : ", nid);
                    let dubBody = {
                        requestType: "easf",
                        searchCriteria: 4,
                        searchValue: nid,
                        startDate: currUnixTime - Util.daysInSeconds(7),
                        endDate: currUnixTime,
                        channels: body.channels
                    };
                    Api.axiosCall(Constants.esafURL, dubBody);
                })
                return true;
            });
    }, { priority: ESAF_PRIORITY });
    engine.addFact(esafFact);
};

module.exports = {
    addNidEsafFacts
};
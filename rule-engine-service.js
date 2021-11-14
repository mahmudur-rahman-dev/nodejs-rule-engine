'use strict'

const { Engine } = require('json-rules-engine')
// const { socket }
const API = require('./API')
const io = require("socket.io-client");
const Constants = require('./Constants')

let socket;

// socket.on('nid', res => {
//     console.log("channel ", res)
// })
function socketInit(channelName) {
    socket = io.connect(
        Constants.socketURL, {
        query: 'username=' + channelName
    }
    );

    socket.on("connect", () => {
        console.log("Connected to the server");
    });

}
async function start() {

    const engine = new Engine()

    // Custom Operator
    // engine.addOperator('onSuccess', (factValue, jsonValue) => {
    //     // if 
    //     return true;
    // })

    // Rules
    const ruleA = {
        conditions: {
            all: [{
                fact: 'ESAF_API',
                operator: 'equal',
                value: true
            }]
        },
        event: {
            type: 'ESAF_API_CALL'
        }
    }
    // engine.addRule(ruleA)


    const ruleB = {
        conditions: {
            all: [{
                fact: 'PASSPORT_API',
                operator: 'equal',
                value: true
            }]
        },
        event: {
            type: 'PASSPORT_API_CALL'
        }
    }
    // engine.addRule(ruleB)

    const ruleC = {
        conditions: {
            all: [{
                fact: 'NID_API',
                operator: 'equal',
                value: true
            }]
        },
        event: {
            type: 'NID_API_CALL'
        }
    }
    engine.addRule(ruleC)

    let facts
    //  ESAF
    // facts = {
    //     msisdn: "8801511222333",
    //     startDate: "1613813995",
    //     endDate: "1614332395",
    //     requestData: "ESAF",
    //     selectionCriteria: "MSISDN",
    //     channelName: "ESAF"
    // }

    // PASSPORT
    // facts= {
    //     nidNumber:"517682610268",
    //     dateOfBirth: "1996-12-26",
    //     channelName:"PASSPORT"
    // }




    // NID
    facts = {
        nidNumber: '19898517682610268',
        dateOfBirth: '1989-12-26',
        channelName: 'nid'
    }
    let keys = Object.keys(facts);

    // Events
    engine
        .on('success', event => {

            console.log(event);
        })
        .on('failure', event => {
            // console.log(facts.word + ' did ' + 'NOT'.red + ' ' + printEventType[event.type])
        })

    engine.addFact('ESAF_API', (params, almanac) => {
        return almanac.factValue(keys[0])
            .then(() => {
                socketInit(facts.channelName)
                var nid = API.ESAF(facts, socket);
                console.log("Inside Fact", nid)
                return true;
                // console.log("Inside Fact ", params)

            })
    })

    engine.addFact('PASSPORT_API', (params, almanac) => {
        return almanac.factValue(keys[0])
            .then(async () => {
                socketInit(facts.channelName)
                var nid = await API.PASSPORT(facts, socket);
                console.log("Inside Fact", nid)
                return true;
                // console.log("Inside Fact ", params)

            })
    })


    engine.addFact('NID_API', (params, almanac) => {
        return almanac.factValue(keys[0])
            .then(nidNumber => {
                socketInit(facts.channelName);
                let nid_promise = new Promise(function (accept, reject) {
                    var nid = API.NID(facts, socket);
                    console.log("Inside Fact", nid)

                    if (nid) {

                        accept(nid)
                    }
                    else {
                        reject("Error in main file")
                    }

                })

                nid_promise.then(
                    function (value) { console.log("in main file", value) },
                    function (error) { console.log("error in main ", error) }
                )
                return true;

            })
    })

    await engine.run(facts)
}

start()

module.exports = { start }
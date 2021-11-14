"use strict";
const {
	Engine
} = require("json-rules-engine");
const Api = require("../api");
const Url = require("../constants/backend_url");
const Util = require("../util/util");
const requestBody = require("../constants/request_body_generator");
const EmptyBodies = require("../constants/response_bodies");
const Redis = require("../util/redis");
const moment = require('moment');
const nidDrivingPassportFacts = require("../facts/nid_driving_passport_unified_nid_facts");
const {
	socket_init, socketSyncInit
} = require("../socket_client/service");

/**
 * Initiate Passport unified rule
 * @param {*} body 
 */
async function unifiedPassportRule(body) {
	const PASSPORT_PRIORITY = 100;
	const NID_PRIORITY = 90;
	const BIRTH_REGISTRATION_PRIORITY = 90;
	const engine = new Engine();
	// Rules
	const rulePassport = {
		conditions: {
			all: [{
				fact: "PASSPORT_API",
				operator: "greaterThanInclusive",
				value: 10,
				path: "$.nidNumber.length",
			}, {
				fact: 'NID_API',
				operator: 'greaterThanInclusive',
				value: 10,
				path: '$.nid.length'
			}, {
				fact: "BIRTH_REGISTRATION_API",
				operator: "equal",
				value: true,
			}],
		},
		event: {
			type: "PASSPORT_API_CALL",
		},
	};
	
	let keys = Object.keys(body);
	engine.on("success", (event) => {
		console.log(event);
	}).on("failure", (event) => {
		Redis.publishToChannels(EmptyBodies.json_empty_esaf_body, body.channels);
		console.log("FAIL");
	});
	const ruleEngineChannel = "rule_engine_" + body.channels[0];
	let socket = await socketSyncInit(ruleEngineChannel);
	console.log("Socket Init Complete");
	engine.addFact("PASSPORT_API", (params, almanac) => {
		return almanac.factValue(keys[0]).then(async() => {
			let dubChannel = [...body.channels];
			dubChannel.push(ruleEngineChannel);
			let dubBody = {
				userId: body.userId || null,
				caseId: body.caseId || null,
				agencyId: body.agencyId || null,
				discoveryId: body.discoveryId || null,
                unifiedViewerId: body.unifiedViewerId || null,
				searchMode: body.searchMode || null,
				parameterType: "PassportNo",
				parameterValue: body.searchValue,
				unifiedViewerBase : true,
				channels: dubChannel,
			};
			console.log("Calling Passport Api");
			const passport = await Api.asyncAxiosCall(Url.passportURL, dubBody, socket);
			socket.destroy();
			let data = {};
			if(passport && passport.passportRecords && passport.passportRecords.length > 0) {
				data.nidNumber = passport.passportRecords[0].nationalID && passport.passportRecords[0].nationalID.length > 0 ? passport.passportRecords[0].nationalID : null;
				data.birthRegistration = passport.passportRecords[0].birthId && passport.passportRecords[0].birthId.length > 0 ? passport.passportRecords[0].birthId : null;
				// data.drivinglicense = (passport.passportRecords[0].nationalID && passport.passportRecords[0].nationalID.length > 0) ? passport.passportRecords[0].nationalID : null;
				let dob = new Date(passport.passportRecords[0].dob);
				data.dateOfBirth = moment(dob).format('YYYY-MM-DD');
			}
			console.log("PassportNO: ", body.searchValue, "Received NID Number: ", data.nidNumber, "DOB: ", data.dateOfBirth, "BirthRegistration:", data.birthRegistration);
			return data;
		});
	}, {
		priority: PASSPORT_PRIORITY
	});
	engine.addFact("NID_API", (params, almanac) => {
		return almanac.factValue("PASSPORT_API").then(async(data) => {
			if(data.nidNumber && data.nidNumber.length > 0) {
				console.log("calling nid api");
				let nidBody = {
					nid: data.nidNumber || null,
					unifiedViewerBase : false,
					birthDate: data.dateOfBirth || null
				}
				return nidBody;
			}
			return {
				nid: ''
			};
		});
	}, {
		priority: NID_PRIORITY
	});
	const factParams = {
		fact: 'NID_API',
		engine: engine,
		nidPriority: NID_PRIORITY - 10,
		rules: rulePassport,
		body: body,
	};
	nidDrivingPassportFacts.addNidDrivingPassportFacts(factParams);
	engine.addFact("BIRTH_REGISTRATION_API", (params, almanac) => {
		return almanac.factValue("PASSPORT_API").then(async(data) => {
			if(data.birthRegistration && data.birthRegistration.length > 0) {
				let dubBody = {
					userId: body.userId || null,
					caseId: body.caseId || null,
					agencyId: body.agencyId || null,
					discoveryId: body.discoveryId || null,
                	unifiedViewerId: body.unifiedViewerId || null,
					searchMode: body.searchMode || null,
					birthRegNo: data.birthRegistration,
					birthDate: data.dateOfBirth,
					channels: [...body.channels],
				};
				console.log("Birth Registration Request Body:", dubBody);
				Api.axiosCall(Url.birthRegistrationURL, dubBody);
			}
			return true;
		});
	}, {
		priority: BIRTH_REGISTRATION_PRIORITY
	});
  engine.addRule(rulePassport);
	await engine.run(body);
}
module.exports = {
	unifiedPassportRule,
};
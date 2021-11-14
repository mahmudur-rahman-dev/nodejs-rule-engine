"use strict";
const {
	Engine
} = require("json-rules-engine");
const Api = require("../api");
const Url = require("../constants/backend_url");
const Util = require("../util/util");
const EmptyBodies = require("../constants/response_bodies");
const Redis = require("../util/redis");
const RequestTypes = require("../constants/request_type");
const {
	socket_init, socketSyncInit
} = require("../socket_client/service");
const nidDrivingPassportFacts = require("../facts/nid_driving_passport_unified_facts");

/**
 * Initiate IMEI or IMSI unified rule
 * @param {*} body 
 */
async function unifiedImeiImsiRRule(body) {
	const engine = new Engine();
	// const CDR_PRIORITY = 100;
	const ESAF_PRIORITY = 100;
	const DRIVING_LICENSE_PRIORITY = 100;
	const NID_PRIORITY = 90;
	// Rules
	const rule_imei_imsi = {
		conditions: {
			all: [{
				fact: "ESAF_API",
				operator: "greaterThanInclusive",
				value: 10,
				path: "$.nid.length",
			}, {
				fact: "DRIVING_LICENSE_API",
				operator: "equal",
				value: true,
			}, ],
		},
		event: {
			type: "unifiedMsisdnDiscovery",
			params: {
				message: "successfully completed Unified Search!",
			},
		},
	};
	let keys = Object.keys(body);
	// Events
	engine.on("success", (event) => {
		console.log(event.params.message);
	}).on("failure", (event) => {
		Redis.publishToChannels(EmptyBodies.json_empty_nid_body, body.channels);
		console.log("Failed to complete IMEI/IMSI Unified");
	});
	/// call 1
	const ruleEngineChannel = "rule_engine_" + body.channels[0] + "_" + Util.create_UUID();
	let socket = await socketSyncInit(ruleEngineChannel);
	console.log("Socket Init Complete");
	engine.addFact("ESAF_API", (params, almanac) => {
		return almanac.factValue(keys[0]).then(async() => {
			const currUnixTime = Math.floor(new Date().getTime() / 1000) - Util.daysInSeconds(1);
			let esaf_body = {
				userId: body.userId || null,
				caseId: body.caseId || null,
				agencyId: body.agencyId || null,
				searchMode: body.searchMode || null,
				discoveryId: body.discoveryId || null,
				unifiedViewerId: body.unifiedViewerId || null,
				requestType: RequestTypes.RequestTypes.ESAF,
				unifiedViewerBase : true,
				searchCriteria: 1,
				searchValue: body.searchValue,
				startDate: currUnixTime - Util.daysInSeconds(7),
				endDate: currUnixTime,
				channels: [...body.channels, ruleEngineChannel]
			};
			console.log("ESAF INIT BODY:", esaf_body);
			let response = await Api.asyncAxiosCall(Url.esafURL, esaf_body, socket);
			socket.destroy();
			if(response && response.numberofRecordsFound && response.numberofRecordsFound > 0) {
				console.log("Completed first ESAF request for rule engine!", " Response Record NID: ", response.numberofRecordsFound);
				console.log(" Received valid data for first ESAF request...", "ESAF INIT Response: ", response);
				const nid = {
					nid: response.responseRecord[0].nid || null,
					birthDate: response.responseRecord[0].birthDate || null,
				};
				return nid;
			}
			return {
				nid: null
			};;
		});
	}, {
		priority: ESAF_PRIORITY
	});
	engine.addFact("DRIVING_LICENSE_API", (params, almanac) => {
		return almanac.factValue(keys[0]).then(() => {
			let dubBody = {
				userId: body.userId || null,
				caseId: body.caseId || null,
				agencyId: body.agencyId || null,
				discoveryId: body.discoveryId || null,
				unifiedViewerId: body.unifiedViewerId || null,
				searchMode: body.searchMode || null,
				parameterType: "mobileNumber",
				parameterValue: body.searchValue,
				channels: body.channels,
			};
			Api.axiosCall(Url.drivingLicenseURL, dubBody);
			console.log("Completed DRIVING LICENSE request for rule engine");
			return true;
		});
	}, {
		priority: DRIVING_LICENSE_PRIORITY
	});
	const factParams = {
		fact: "ESAF_API",
		engine: engine,
		nidPriority: NID_PRIORITY,
		rules: rule_imei_imsi,
		body: body,
	};
	nidDrivingPassportFacts.addNidDrivingPassportFacts(factParams);
	engine.addRule(rule_imei_imsi);
	await engine.run(body);
}
module.exports = {
	unifiedImeiImsiRRule,
};
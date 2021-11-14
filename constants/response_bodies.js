const moment = require('moment');
var momentTimeZone = require('moment-timezone');
const RequestTypes = require('./request_type')
const util = require('../util/util')


const json_empty_passport_body = 
{
    data: {
      "numberofRecordsFound": 0,
      "responseRecord": [],
    },
    error: null,
    type: RequestTypes.RequestTypes.PASSPORT
};

const json_empty_esaf_body = 
{
    data: {
      numberofRecordsFound: 0,
      responseRecord: [],
    },
    error: null,
    type: RequestTypes.RequestTypes.ESAF,
    operator: null
}

const json_empty_driving_license_body = 
{
  data: {
      numberofRecordsFound: 0,
      drivingLicenseRecord: []
  },
  error: null,
  type: RequestTypes.RequestTypes.DRIVINGLICENSE
}

const json_empty_nid_body = 
{
  data: null,
  error: {
      // timestamp: new Date(Date.now()).toLocaleString("en-US", { timeZone: "Asia/Dhaka" }),
      // timestamp: moment(Date.now()).tz('Europe/Berlin').format("DD-MM-YYYY h:mm:ss") ,
      timestamp:  util.getCurrentTimeWithTimeZone(),
      status: "NO_DATA_FOUND_ERROR",
      error: "No Data Found",
      message: "No Data Found!"
  },
  type: RequestTypes.RequestTypes.NID
}

const json_empty_vehicle_body = 
{
  data: null,
  error: {
      timestamp: util.getCurrentTimeWithTimeZone(),
      status: "NO_DATA_FOUND_ERROR",
      error: "No Data Found",
      message: "No Data Found!"
  },
  type: RequestTypes.RequestTypes.VEHICLEREGISTRATION
}

module.exports = {
    json_empty_passport_body,
    json_empty_driving_license_body,
    json_empty_esaf_body,
    json_empty_nid_body,
    json_empty_vehicle_body
};
const moment = require('moment');
// util file

const daysInSeconds = function (days) {
    return days * 86400;
}

function create_UUID() {
    let dt = new Date().getTime();
    let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
}
function timeStampToData(date) {
    const dob = new Date(date);
    const dateOfBirth = moment(dob).format("YYYY-MM-DD")
    return dateOfBirth
}

function getCurrentTimeWithTimeZone(){
    currentTime = moment(Date.now()).tz('Asia/Dhaka').format("DD-MM-YYYY h:mm:ss")
    return currentTime
}

module.exports = { daysInSeconds, create_UUID,timeStampToData , getCurrentTimeWithTimeZone};

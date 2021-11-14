
function getNidRequestBody(nidNumber, dob, body) {
    return {
        "userId": body.userId || null,
        "caseId": body.caseId || null,
        "agencyId":body.agencyId || null,
        "searchMode": body.searchMode || null,
        "discoveryId": body.discoveryId || null,
        "unifiedViewerId": body.unifiedViewerId || null,
        "nidNumber": nidNumber || null,
        "dateOfBirth": dob || null,
        "channels": [...body.channels]

    };
}
module.exports = { getNidRequestBody }
const Api = require('../api');
const url= require('../constants/backend_url');
/**
 * 
 * @param {*} body 
 * @returns 
 */
const getUnifiedViewerId = async function(body) {
    let unifiedViewer = await Api.axiosGetCall(url.caseManagementUnifiedViewerSearchByDiscoveryIdSURL + `/${body.discoveryId}`);

    if(unifiedViewer.data  && unifiedViewer.data.length >0) {
        return unifiedViewer.data[0];
    }

    const reqBody = {
        name: `${body.searchValue}_${body.searchCriteria}_unified_viewer`,
        caseId: body.caseId,
        userId: body.userId,
        discoveryId: body.discoveryId,
        agencyId: body.agencyId,
        description: "Unified viewer"
    };
    unifiedViewer = await  Api.axiosCall(url.caseManagementUnifiedViewerCreationURL, reqBody);

    if(unifiedViewer.data && unifiedViewer.data.length > 0) {
        unifiedViewer = unifiedViewer.data.find(viewer => viewer.discoveryId == body.discoveryId);
        return unifiedViewer;
    }

    return null;
}

module.exports = {
    getUnifiedViewerId
};

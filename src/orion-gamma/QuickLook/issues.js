var debug = require('debug')('orion-gamma:quickLook-tags');
var moment = require('moment');

var Github = require('github-api');
const {ghCredentials} = require('../credentials.js');
var ghApi = new Github(ghCredentials);

const {sleep, MaybeDo, PassThrough} = require('../utils/promiseUtils.js');
const {debugError, TIMERANGE} = require('./utils.js');

// ------------------------------
// Issues
function cleanIssueData(issues) {
    let out=[];
    issues.map(i => {
        let baseIssue = {
            type: 'Issue',
            state: i.state,
            title: i.title
        };

        let states = ['closed_at', 'created_at', 'updated_at'];
        states.map(s => {
            baseIssue[s] = i[s];
        });

        out.push(baseIssue);
    });
    return out;
};

function getIssues(creds) {
    let CUTOFFDATE=moment().subtract(TIMERANGE, 'months');
    
    return ghApi.getIssues(creds.user, creds.repo)
        .listIssues({
            since: CUTOFFDATE.toISOString(),
            state: 'all'})
        .then( res => res.data )
        .then( cleanIssueData )
        .catch( debugError('Get Issues', true) );
};

module.exports.getIssues = getIssues;

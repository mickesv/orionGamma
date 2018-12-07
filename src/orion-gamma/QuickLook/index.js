var debug = require('debug')('orion-gamma:quickLook');
var moment = require('moment');

const {sleep, MaybeDo, PassThrough} = require('../utils/promiseUtils.js');

const {debugError, getUserAndRepo, getRepo} = require('./utils.js');
const {getForks} = require('./forks.js');
const {getCommits} = require('./commits.js');
const {getTags} = require('./tags.js');
const {getIssues} = require('./issues.js');
const {getDetails} = require('./details.js');
const {processResults} = require('./process.js');
const {badgeify, gatherChartData} = require('./outputFormatting.js');
const {makeAssessmentSummary} = require('./assessmentSummary.js');


// ------------------------------
// Main function
const getData = (url, name) => {
    let promises = [];
    name = name || url;
    
    const urlPromise = Promise.resolve(url);
    const getRepoPromise = urlPromise.then( getRepo );
    const getUserAndRepoPromise = urlPromise.then( getUserAndRepo );
    const getCommitsPromise = getRepoPromise.then( getCommits );        
    const getDetailsPromise = getRepoPromise.then( getDetails(name) );
    
    promises.push(urlPromise.then( p => debug ('Gathering data from %s', p)));
    promises.push(getRepoPromise.then( getForks ));
    promises.push(getCommitsPromise);
    promises.push(getCommitsPromise.then( getTags(getRepoPromise) ));
    promises.push(getUserAndRepoPromise.then( getIssues ));
    
    return Promise.all(promises)
        .then( processResults(getDetailsPromise) )
        .then( badgeify )
        .then( gatherChartData )
        .then( makeAssessmentSummary )
        .then( PassThrough( p => debug('Done with %s', p.name)) )
        .catch( debugError('getData', true) );
};

module.exports.getData = getData;

// Debug
// getData('https://github.com/transloadit/uppy.git');

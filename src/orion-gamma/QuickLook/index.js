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


function makeAssessmentSummary(project) {
    // TODO: Get descriptive texts from database instead
    return Promise.resolve(project)
        .then(project => {
            let a=[];

            a.push('Commits: ' + project.data.Commit.AssessedActivity.verbose);
            a.push('Tags: ' + project.data.Tag.AssessedActivity.verbose);
            a.push('Created Issues: ' + project.data.Issue.AssessedActivity.Created.verbose);
            a.push('Closed Issues: ' + project.data.Issue.AssessedActivity.Closed.verbose);
            a.push('Forks: ' + project.data.Fork.AssessedActivity.verbose);
            
            project.assessmentSummary='TODO ' + a.join(', ');
            
            return project;
        })
        .catch( (err) => {
            debugError('Make Assessment Summary', false)(err);
            return project;
        });
};

// ------------------------------
// Main function
const getData = (url) => {
    let promises = [];
    
    const urlPromise = Promise.resolve(url);
    const getRepoPromise = urlPromise.then( getRepo );
    const getUserAndRepoPromise = urlPromise.then( getUserAndRepo );
    const getCommitsPromise = getRepoPromise.then( getCommits );        
    const getDetailsPromise = getRepoPromise.then( getDetails );
    
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

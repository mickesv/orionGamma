var debug = require('debug')('orion-gamma:quickLook-assessmentSummary');

var db = require('../db/db-setup');
var assessments = require('../db/assessmentSummaries.js');

function makeAssessmentSummary(project) {
    let query = {
        commits: project.data.Commit.AssessedActivity.verbose,
        tags: project.data.Tag.AssessedActivity.verbose,
        created_issues: project.data.Issue.AssessedActivity.Created.verbose,
        closed_issues: project.data.Issue.AssessedActivity.Closed.verbose,
        forks: project.data.Fork.AssessedActivity.verbose
    };
    project.assessmentSummary='Could not find an assessment for ' + JSON.stringify(query, null, 1);
    
    return assessments.findOne(query).
        then(res => {
            debug(res);            
            if(res) {
                project.assessmentSummary=res.assessment;
            }
            return project;                
        })
        .catch(err => {
            debugError('Make Assessment Summary', false)(err);
            return project;
        });
};

module.exports.makeAssessmentSummary = makeAssessmentSummary;

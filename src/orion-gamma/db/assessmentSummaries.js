var mongoose = require('mongoose');
var Schema = mongoose.Schema;


// Set up Schemas and Models
// --------------------

var assessmentSummarySchema = new Schema({
    commits: String,
    tags: String,
    created_issues: String,
    closed_issues: String,
    forks: String,
    assessment: String
});

assessmentSummarySchema.index({commits:1, tags: 1, created_issues:1, closed_issues:1, forks:1});

module.exports = mongoose.model('AssessmentSummary', assessmentSummarySchema);


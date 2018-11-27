var mongoose = require('mongoose');
var Schema = mongoose.Schema;


// Set up Schemas and Models
// --------------------

var assessmentFeedbackSchema = new Schema({
    assessment: String,
    feedback: String,
    textFeedback: String,
    details: {    
        commits: String,
        tags: String,
        created_issues: String,
        closed_issues: String,
        forks: String
    }
});


module.exports = mongoose.model('AssessmentFeedback', assessmentFeedbackSchema);


var debug = require('debug')('orion-gamma:feedbackController');

var db = require('../db/db-setup');
var Feedback = require('../db/feedback.js');


module.exports.submitFeedback = (req, res) => {
    let f = new Feedback();
    f.assessment = req.body.assessment;
    f.feedback = req.body.feedback;
    f.textFeedback = req.body.textFeedback;

    let details=['commits', 'tags', 'created_issues', 'closed_issues', 'forks'];
    details.map( k => {
        f.details[k] = req.body['details['+k+']'];
    });

    debug('Saving feedback %o', f);        
    f.save();
    
    return res.sendStatus(200);
};

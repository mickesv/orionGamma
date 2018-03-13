var mongoose = require('mongoose');
var Schema = mongoose.Schema;


// Set up Schemas and Models
// --------------------

var logstartSchema = new Schema({
    name : String,
    time : Date
});



module.exports.logstart = function() {
    var logMod = mongoose.model('logstart', logstartSchema);
    var timeStamp = Date.now();
    var appStart = new logMod({name:'Started system', time: timeStamp});
    appStart.save(function(err) {
        if (err) return handleError(err);
    });
};

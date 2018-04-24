var mongoose = require('mongoose');
var Schema = mongoose.Schema;


// Set up Schemas and Models
// --------------------

var keywordSchema = new Schema({
    name : String,
    trawlLevel: Number,
    count : Number,
    isTrawled : Boolean
});


module.exports = mongoose.model('keyword', keywordSchema);


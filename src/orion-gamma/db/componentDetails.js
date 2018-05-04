var mongoose = require('mongoose');
var Schema = mongoose.Schema;


// Set up Schemas and Models
// --------------------

var componentDetailsSchema = new Schema({
    name : String,
    repository: {
        type: String,
        url: String
    },
    bugs: String,
});


module.exports = mongoose.model('ComponentDetails', componentDetailsSchema);


var mongoose = require('mongoose');
var Schema = mongoose.Schema;


// Set up Schemas and Models
// --------------------

var npmComponentsSchema = new Schema({
    name : String,
    trawlLevel: Number,
    description : String,
    'dist-tags': Schema.Types.Mixed,
    versions : [{
        version: String,
        time: String,
        gitHead: String
    }],
    homepage: String,
    keywords : [String],
    repository: Schema.Types.Mixed,
    bugs: String,
    license: Schema.Types.Mixed,
    author: Schema.Types.Mixed,
    componentDetailsState: String,
    componentDetails: {type: Schema.Types.ObjectId, ref: 'ComponentDetails'}
});


module.exports = mongoose.model('npmComponents', npmComponentsSchema);


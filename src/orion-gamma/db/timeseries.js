var mongoose = require('mongoose');
var Schema = mongoose.Schema;


// Set up Schemas and Models
// --------------------

var timeseriesSchema = new Schema({
    project : String,
    type : String,
    event : String,
    time : Date,
    data : Schema.Types.Mixed,
    npmComponent : {type: Schema.Types.ObjectId, ref: 'npmComponents'}
});

timeseriesSchema.index({project:1, time:1});
module.exports = mongoose.model('timeseries', timeseriesSchema);

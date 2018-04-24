// Setup Mongoose
var mongoose = require('mongoose');


var mongoDB = 'mongodb://appserver/gamma-db';
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;

var db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));



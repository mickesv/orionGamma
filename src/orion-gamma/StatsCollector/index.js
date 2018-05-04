var debug = require('debug')('orion-gamma:StatsCollector-main');
var dateFormat = require('dateformat');
var promiseLoop = require('promise-loop');

var db = require('../db/db-setup');
var dbComponents = require('../db/npmComponents.js');
var dbComponentDetails = require('../db/componentDetails.js');   

var ghCollector = require('./githubCollector.js');

var COOLOFF = 1000;
// var query = {componentDetailsState:undefined};
var query = {name: 'chai-datetime'};
// var query = {name: 'timeago.js'};

function sleep(ms) {
    return new Promise( resolve => {
        setTimeout(resolve, ms);
    });
}

function collectComponent() {
    return dbComponents.findOneAndUpdate(
        query,
        {componentDetailsState:Date.now()},
        {new: true})
        .then( async (res) => {
            if (null == res) {
                debug('Nothing to do. Cooling off...');
                await sleep(COOLOFF);
                return null;
            } else {
                return ghCollector.collect(res);
            };
        })
        .then( async () => { await sleep(60000); }) // TODO remove this debug measure or replace it with a better cooloff
        .catch( (err) => { return debug(err); });
};

module.exports.startCollecting = () => {
    var myPromiseLoop = promiseLoop(collectComponent);
    Promise.resolve().then( () => { return debug('Looking for something to do...'); })
        .then(myPromiseLoop)
        .then(() => { return debug('Closing down...'); });    
};


module.exports.startCollecting(); // Start listening for incoming messages

var debug = require('debug')('orion-gamma:StatsCollector-main');
// var dateFormat = require('dateformat');
var promiseLoop = require('promise-loop');

var db = require('../db/db-setup');
var dbComponents = require('../db/npmComponents.js');
var dbComponentDetails = require('../db/componentDetails.js');   

var ghCollector = require('./githubCollector.js');

const {sleep} = require('../utils/promiseUtils.js');

const COOLOFF = 60000;
var query = {componentDetailsState:undefined};
// var query = {name: 'chai-datetime'};
// var query = {name: 'timeago.js'};

// TODO Fix this so that I can interrupt at a nice place and exit prettily.
function collectComponent() {
    debug('Trawling a project...');
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
                return ghCollector.collect(res)
                    .catch( async () => {
                        debug('Had an error. Cooling off before trying again...');
                        await sleep(COOLOFF);
                        return null;
                    })
                    .then( ghCollector.cleanup );
            };
        })
        .then( async () => {
            await sleep(COOLOFF); })
        .catch( (err) => { return debug(err); });
};

module.exports.startCollecting = () => {
    var myPromiseLoop = promiseLoop(collectComponent);
    Promise.resolve()
        .then(myPromiseLoop)
        .then(() => { return debug('Closing down...'); });    
};


module.exports.startCollecting(); // Start listening for incoming messages

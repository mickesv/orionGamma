var debug = require('debug')('orion-gamma:quickLook-forks');
var moment = require('moment');

const {sleep, MaybeDo, PassThrough} = require('../utils/promiseUtils.js');
const {debugError,limitRange} = require('./utils.js');

// ------------------------------
// Forks
function cleanForkData(events) {
    let out = [];
    events.map(e => {
        out.push({
            type: 'Fork',
            created_at: e.created_at,
            time: e.created_at,
            url: e.url,
            description: e.description
        });
    });

    return out;
};

function getForks(repo) {
    return repo.listForks()
        .then( res => res.data )
        .then( cleanForkData )
        .then( limitRange )
        .catch( debugError('getForks', true) );
};

module.exports.getForks = getForks;

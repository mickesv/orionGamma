var debug = require('debug')('orion-gamma:quickLook-utils');
var moment = require('moment');

var Github = require('github-api');
const {ghCredentials} = require('../credentials.js');
var ghApi = new Github(ghCredentials);

// TODO: Maybe breakout the following to a separate util -- for now, I am copying it from /StatsCollector/githubCollector.js

/** Use in catch-alls to try to print a nicer error message, and possibly rethrow the error */
const debugError = (message, rethrow = false) => (err) => {
    let out = String(err).substring(0,50);
    debug('ERROR in %s: %s', message, out);

    if (rethrow) {        
        throw err;
    };
};

/** Cleanup the URL so that it can be used by the github API */
function cleanURL(url) {
    // TODO don't assume it is a well formed github url
    const URLHeads = ['://github.com/', '://git@github.com/'];
    const URLTail = '.git';

    if (!url.includes('github')) {
        throw 'Not a github URL: ' + url;
    }    
    
    url = url.split('#')[0];
    
    if (url.endsWith(URLTail)) {
        url = url.slice(0, -URLTail.length);
    }

    URLHeads.some( URLHead => {
        let pos = url.search(URLHead);    
        if(-1 != pos) {
            url= url.slice(pos + URLHead.length);
            return true;
        } else {
            return false;
        };
    });


    return url;
};

/** Reformat a user/repo - url to an {user,repo} object */
function getUserAndRepo(url) {
    let ur = cleanURL(url).split('/'); 
    return {user:ur[0], repo:ur[1]};
};

/** Get the github API handle for a repository */
function getRepo(url) {
    return Promise.resolve(getUserAndRepo(url))
        .then( (res) => { return ghApi.getRepo(res.user, res.repo); })
        .catch( debugError('getRepo', true) );
};


const TIMERANGE=6; // months
function limitRange(events) {
    let earliest=moment().subtract(TIMERANGE, 'months');
    return events.filter(e => {
        return (e.time &&
                '' != e.time &&
                earliest.isBefore(e.time));
    });
};

module.exports.debugError = debugError;
module.exports.cleanUrl = cleanURL;
module.exports.getUserAndRepo = getUserAndRepo;
module.exports.getRepo = getRepo;
module.exports.limitRange = limitRange;
module.exports.TIMERANGE = TIMERANGE;

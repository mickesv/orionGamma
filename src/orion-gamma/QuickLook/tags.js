var debug = require('debug')('orion-gamma:quickLook-tags');
var moment = require('moment');

const {sleep, MaybeDo, PassThrough} = require('../utils/promiseUtils.js');
const {debugError, limitRange} = require('./utils.js');

// ------------------------------
// Tags

function cleanTagData(tags) {
    let out = [];
    tags.map(t => {
        out.push({
            type: 'Tag',
            name: t.name,
            sha: t.commit.sha,
            time: ''
        });
    });
    return out;
};

const extractTagTime = (commits) => (tags) => {
    tags.map(t => {
        let commit = commits.find(c => {
            return (t.sha == c.sha);
        });
        if (commit) {
            t.time=commit.time;
        };
    });

    return tags;
};

const getTags = (getRepoPromise) => (commits) => {
    return getRepoPromise.then( repo => {
        return repo.listTags()
            .then( res => res.data )
            .then( cleanTagData )
            .then( extractTagTime(commits) )
            .then( limitRange )
            .catch( debugError('Get Tags', true) );
    });
};

module.exports.getTags = getTags;

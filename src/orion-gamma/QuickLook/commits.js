var debug = require('debug')('orion-gamma:quickLook-commits');
var moment = require('moment');

const {sleep, MaybeDo, PassThrough} = require('../utils/promiseUtils.js');
const {debugError, limitRange, TIMERANGE} = require('./utils.js');



// ------------------------------
// Commits
function getSomeCommits(repo, options) {
    return repo.listCommits(options)
        .catch( (err) => {
            let out = String(err).substring(0,30);
            debugError('Got error back from Github %s', out);
            return { data: [] };
        });
}

function getFirstInRange(events,filter) {
    return events.reduce( (acc, cur) => {
        if (moment(filter(acc)).isBefore(filter(cur))) {
            return acc;
        } else {
            return cur;
        }
    });
}

const CUTOFFCOMMIT=500;    
function checkCutoff(firstDate, amount) {
    let CUTOFFDATE=moment().subtract(TIMERANGE, 'months');
    
    if (CUTOFFCOMMIT <= amount) {
        debug('Cutting short, have %d , cutoff is at %d', amount, CUTOFFCOMMIT);
        return true;
    }

    if (firstDate.isBefore(CUTOFFDATE)) {
        debug('Cutting short, first date %s is earlier than %s', firstDate, CUTOFFDATE);        
        return true;
    }

    return false;
}

const PERPAGE=100;
const COOLOFF = 1000;
function getNext(repo, fn, filter, context, buildup=[], options={per_page: PERPAGE}) {
    // Recursive fetchers to get more than PERPAGE results        
    return fn(repo, options)
        .then( res => {
            if (!res) {
                throw "Recursive getNext; Did not get any results";
            }
            
            let first = getFirstInRange(res.data, filter);

            if (1 >= res.data.length ||
                checkCutoff(moment(filter(first)), buildup.length)) {
                return buildup.concat(res.data);
            } else {
                let first = getFirstInRange(res.data, filter);
                return Promise.resolve()
                    .then( async () => {
                        debug(' Cooling off before looking for %ss...', context);
                        await sleep(COOLOFF);
                    })
                    .then( () => debug(' Finding more %ss. Now up to %d, looking before %s',
                                       context,
                                       buildup.length+res.data.length,
                                       moment(filter(first)).format('YYYY-MM-DD')))
                    .then( () => getNext(repo,
                                         fn,
                                         filter,
                                         context,
                                         buildup.concat(res.data),
                                         {until: filter(first),
                                          per_page: PERPAGE})
                           .catch( debugError('getNext::inner(return from recurse)' + context, true)))
                    .catch( debugError('getNext::inner' + context, true));
            }
        })
        .catch( debugError('getNext::' + context, true) );
}

const listAll = (repo, fn, filter, context) => {
    return getNext(repo, fn, filter, context)
        .then( res => {
            return { data: res };
        })
        .catch( debugError('listAll ' + context, true) );    
};

function cleanCommitData(commits) {
    let out = [];
    commits.map(c => {
        out.push({
            type: 'Commit',
            message: c.commit.message,
            author_at: c.commit.author.date,
            commit_at: c.commit.committer.date,
            time: c.commit.committer.date,
            sha: c.sha
        });
    });

    return out;
}

function getCommits(repo) {
    return listAll(repo, getSomeCommits, (obj) => obj.commit.committer.date, 'commit')
        .then( res => res.data )
        .then( cleanCommitData )
        .then( limitRange )
        .catch( debugError('Get Commits', true) );    
};

module.exports.getCommits = getCommits;

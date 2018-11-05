var debug = require('debug')('orion-gamma:statsCollector-github');
var moment = require('moment');
var handlers = require('../utils/handlers');

var db = require('../db/db-setup');
//var dbComponentDetails = require('../db/componentDetails.js');   
var Timeseries = require('../db/timeseries.js');
var dbComponents = require('../db/npmComponents.js');


var npmHandler = handlers.getHandler('npm');
var Github = require('github-api');

const {ghCredentials} = require('../credentials.js');
var ghApi = new Github(ghCredentials);

const {sleep, MaybeDo, PassThrough} = require('../utils/promiseUtils.js');
const COOLOFF = 10000;

/**
 * Store events of a particular type to MongoDB
 * Currying here; store() takes three paramaters and returns a lambda() with one parameter.
 * The lambda is called by the promise-chain with the result-object from the previous step of the chain.
 */
const store = (project, type, events) => (elements) => {
    debug('Storing %d %ss for project %s', elements.data.length, type, project.name);
    
    elements.data.forEach( (issue) => {
        events.forEach( (e) => {
            let t = new Timeseries();
            t.project = project.name;
            t.type = type;
            t.event = e;
            t.time = issue[e];
            t.data = issue;
            t.npmComponent = project._id;
            t.save();
        });
    });                               
};

/** Use in catch-alls to try to print a nicer error message, and possibly rethrow the error */
const debugError = (message, rethrow = false) => (err) => {
    let out = String(err).substring(0,50);
    debug('ERROR in %s: %s', message, out);

    if (rethrow) {        
        throw err;
    };
};


/** Return the URL to the repo if it is available, otherwise, return null */
function getRepoPreexist(project) {
    if (project.repository &&
        project.repository.url) {
        return project.repository.url;
    } else {
        return null;
    }
}

/** Try to treat the project as an NPM project, go fetch the repository URL from NPM. */
function getRepoNPM(project) {
    return new Promise( (resolve, reject) => {
        npmHandler.getRawDetails(project.name, (err, res) => {
            if (err) {
                return reject(err);
            } else {
                return resolve(res.repository.url);
            }
        });           
    });
}

/** Try to treat the project as a Github repository, find the repository URL that way */
function getRepoGithub(project) {
    // TODO search in github for project name to find repository
    return {
        repository: {
            url: 'https://github.com/user/project.git'
        }};
}

/** Cleanup the URL so that it can be used by the github API */
function cleanURL(url) {
    // TODO don't assume it is a well formed github url
    const URLHeads = ['://github.com/', '://git@github.com/'];
    const URLTail = '.git';

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
}

/** Reformat a user/repo - url to an {user,repo} object */
function getUserAndRepo(url) {
    let ur = cleanURL(url).split('/'); 
    return {user:ur[0], repo:ur[1]};
}

/** Go through a number of approaches to find the github user / repo for the project */
function getRepoCredentials(project) {
    return Promise.resolve()
        .then( ()    => { return MaybeDo(getRepoPreexist(project), project, getRepoNPM); })
        .then( (res) => { return MaybeDo(res, project, getRepoGithub); })
        .then( PassThrough( (res) => { project.repository = {url:res}; }))
        .then( getUserAndRepo )
        .catch( debugError('getRepoCredentials', true) );
}

/** Get the github API handle for a repository */
function getRepo(project) {
    return getRepoCredentials(project)
        .then( (res) => { return ghApi.getRepo(res.user, res.repo); })
        .catch( debugError('getRepo', true) );
}

/** Search github for the issues associated with a repo */
function getIssues(project) {
    return getRepoCredentials(project)
        .then( (res) => {
            return ghApi.getIssues(res.user, res.repo)
                .listIssues({sort: 'updated',
                             state: 'all'})
                .catch( debugError('getIssues:listIssues', true) );
        })
        .then( store(project, 'Issue', ['created_at', 'updated_at', 'closed_at']) )
        .catch( debugError('getIssues', true) );
}

/** Get the date from the commit associated with a tag */
const extractTagTime = (repo) => (tags) => {
    return new Promise( (resolve, reject) => {
        let promises = [];
        tags.data.forEach( (t) => {
            promises.push(Promise.resolve(repo)
                          .then( (res) => { return res.getCommit(t.commit.sha); })
                          .then( (res) => {
                              t.commit_at = res.data.committer.date;
                          }));
        });

        Promise.all(promises)
            .then( () => { resolve(tags); })
            .catch( debugError('extractTagTime', true) );
    });
};

function extractCommitTime(commits) {
    commits.data.forEach( (c) => {
        c.author_at = c.commit.author.date;
        c.commit_at = c.commit.committer.date;
    });

    return commits;
}

// TODO: I am currently only using the 'stats' very shallowly. Do I need it at all?
const extractCommitDetails = (repo) => (commits) => {
    const TIMEWINDOW = 500;
    debug('Extracting commit details');
    return new Promise( (resolve, reject) => {
        let promises= [];
        commits.data.forEach( (c) => {
            c.details= {
                stats: {
                    total: null,
                    additions: null,
                    deletions: null
                },
                files: []
            };                       
            // promises.push( Promise.resolve(repo)
            //                .then( async (repo) => {
            //                    let cooloff = Math.floor(Math.random() * commits.data.length * TIMEWINDOW)+COOLOFF; // 0.5 seconds per commit, but first wait a bit.
            //                    await sleep(cooloff);
            //                    return repo;                                   
            //                })
            //                .then( (res, reject) => {
            //                    if (c.sha) {
            //                        return res.getSingleCommit(c.sha);
            //                    } else {
            //                        throw 'Invalid Commit -- no sha.';
            //                    };
            //                })
            //                .then( (res) => {
            //                    c.details = {
            //                        stats: res.data.stats,
            //                        files: res.data.files
            //                    };
            //                })
            //                .catch( err => {
            //                    if ('Invalid Commit -- no sha.' == err) {
            //                        debug(err);
            //                    } else {
            //                        throw err;
            //                    }                                  
            //                })
            //                // .catch( debugError('extractCommitdetails::getSingleCommit', true) ) // Do not catch here, better to silentely escalate.
            //              );
        });

        return resolve(commits);

        // return Promise.resolve()
        //     .then(() => {
        //         let time=((commits.data.length*TIMEWINDOW)+COOLOFF)/1000;
        //         debug('Extracting commit details for %d commits. This may take at least %d seconds', commits.data.length, time);
        //         debug('Current Time is %s, estimated completion at %s', moment().format('HH:mm:ss'), moment().add(time, 'seconds').format('HH:mm:ss'));
        //     })
        //     .then( () => Promise.all(promises) )
        //     .then( () => resolve(commits) )
        //     .catch( err => {
        //         debugError('extractCommitDetails::inner', false)(err);
        //         reject(err);
        //     });
    })
        .catch( debugError('extractCommitDetails::outer', true) );
};

function getCommits(repo, options) {
    return repo.listCommits(options)
        .catch( (err) => {
            let out = String(err).substring(0,30);
            debugError('Got error back from Github %s', out);
            return { data: [] };
        });
}


// ---------- Recursive fetchers, use where applicable to get more than PERPAGE results
function getFirstInRange(events,filter) {
    return events.reduce( (acc, cur) => {
        if (moment(filter(acc)).isBefore(filter(cur))) {
            return acc;
        } else {
            return cur;
        }
    });
}

const PERPAGE=100;
function getNext(repo, fn, filter, context, buildup=[], options={per_page: PERPAGE}) {
    return fn(repo, options)
        .then( res => {
            if (!res) {
                throw "Recursive getNext; Did not get any results";
            }
            if (1 >= res.data.length) {
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


/**
 * Search github for the events associated with a project
 * Currently extracts: Forks, Commits, Tags
 */
function getEvents(project) {
    let promises = [];
    const getRepoPromise = getRepo(project);
    promises.push( getRepoPromise
                   .then( repo => {
                       return repo.listForks()
                           .then( store(project, 'Fork', ['pushed_at', 'created_at', 'updated_at']) )
                           .catch( debugError('List Forks', true) );              
                   }));
    promises.push( getRepoPromise
                   .then( repo => {
                       return repo.listTags()
                           .then( extractTagTime(repo) )
                           .then( store(project, 'Tag', ['commit_at']) )
                           .catch( debugError('List Tags', true) );
                   }));
    promises.push( getRepoPromise
                   .then( repo => {
                       return listAll(repo, getCommits, (obj) => obj.commit.committer.date, 'commit')                      
                           .then( extractCommitTime )
                           .then( extractCommitDetails(repo) )
                           .then( store(project, 'Commit', ['author_at', 'commit_at']) )
                           .catch( debugError('List Commits', true) );
                   }));
    
    return Promise.all(promises)
        .catch( debugError('getEvents', true) );
}


function getProjectDetails(project) {
    let details={
        full_name: "",
        forks_count: 0,
        stargazers_count: 0,
        watchers_count: 0,
        subscribers_count: 0,
        size: 0,
        open_issues_count: 0,
        created_at: "",
        updated_at: "",
        pushed_at: "",
        license: undefined,
        organization: undefined,
        parent: undefined        
    };

    const getRepoPromise = getRepo(project);
    return getRepoPromise
        .then( PassThrough( () => { debug('Collecting Project Details'); }))
        .then( repo => repo.getDetails()
               .then( res => {
                   Object.keys(details).map(k => {
                       details[k] = res.data[k];
                   });
                   return details;
               })
               .then( details => {
                   dbComponents.findOneAndUpdate({name:project.name},
                                                 {componentDetails:details},
                                                 {new:true}).exec();
                                                 
               })
               .catch( debugError('Get Project Details :: inner', true) )
             )
        .catch( debugError('Get Project Details :: outer', true) );
}


/** Main function for this module -- extracts each type of interesting statistics for a project */
module.exports.collect = (project) => {
    const resolveProjectPromise = Promise.resolve(project);

    let promises=[];
    promises.push(resolveProjectPromise.then( p => debug('Trawling %s', p.name) ));
    promises.push(resolveProjectPromise.then( getIssues ));
    promises.push(resolveProjectPromise.then( getEvents ));
    promises.push(resolveProjectPromise.then( getProjectDetails ));
    
    return Promise
        .all(promises)
        .then( PassThrough( () => { debug('Done trawling project...'); }))
        .catch( (err) => {
            resetProject(project.name);
            debugError('Collect Issues/Events', true);            
        });
};


function resetProject(name) {
    debug('Resetting %s', name);    
    dbComponents.findOneAndUpdate(
        {name:name},
        {$unset: {componentDetailsState:''}},
        {new: true}).exec();
    Timeseries.remove({project:name});
};

module.exports.resetProject = resetProject;

module.exports.cleanup = () => {    
    return dbComponents.find({componentDetailsState: {$exists:true}}).exec()
        .then( (updated) => {
            updated.forEach( (e) => {
                Timeseries.find({project:e.name}).then( (res) => {
                    if (0 == res.length) {
                        debug('%s appears to be empty.', e.name);
                        resetProject(e.name);
                    }
                });
            });
        })
        .catch( debug);
};

//
// For a full Cleanup, do the following in MongoDB:
// 
// > db.timeseries.remove({})
// > db.npmcomponents.update({componentDetailsState: {$exists:true}}, {$unset: {componentDetailsState:''}}, {multi:true})
//


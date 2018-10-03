var debug = require('debug')('orion-gamma:statsCollector-github');
var moment = require('moment');
var handlers = require('../utils/handlers');

var db = require('../db/db-setup');
var dbComponentDetails = require('../db/componentDetails.js');   
var Timeseries = require('../db/timeseries.js');


var npmHandler = handlers.getHandler('npm');
var Github = require('github-api');
var ghApi = new Github(//);
{
    username: 'mickesv',
    password: ''}); // use this when hitting rate-limits on github

const {MaybeDo, PassThrough} = require('../utils/promiseUtils.js');

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
    const URLHead = '://github.com/';
    const URLTail = '.git';

    if (url.endsWith(URLTail)) {
        url = url.slice(0, -URLTail.length);
    }
    
    let pos = url.search(URLHead);    
    if(-1 != pos) {
        url= url.slice(pos + URLHead.length);
    }

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
        .catch( debug );
}

/** Get the github API handle for a repository */
function getRepo(project) {
    return getRepoCredentials(project)
        .then( (res) => { return ghApi.getRepo(res.user, res.repo); });
}

/** Search github for the issues associated with a repo */
function getIssues(project) {
    return getRepoCredentials(project)
        .then( (res) => {
            return ghApi.getIssues(res.user, res.repo)
                .listIssues({sort: 'updated',
                             state: 'all'});
        })
        .then( store(project, 'Issue', ['created_at', 'updated_at', 'closed_at']) );    
}


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
            .then( () => { resolve(tags); });
    });
};

function extractCommitTime(commits) {
    commits.data.forEach( (c) => {
        c.author_at = c.commit.author.date;
        c.commit_at = c.commit.committer.date;
    });

    return commits;
}

const extractCommitDetails = (repo) => (commits) => {
    return new Promise( (resolve, reject) => {
        let promises= [];
        commits.data.forEach( (c) => {
            promises.push( Promise.resolve(repo)
                           .then( (res, reject) => {
                               if (c.sha) {
                                   return res.getSingleCommit(c.sha);
                               } else {
                                   throw 'Invalid Commit -- no sha.';
                               };
                           })
                           .then( (res) => {
                               c.details = {
                                   stats: res.data.stats,
                                   files: res.data.files
                               };
                           })
                           .catch( debug )
                         );
        });

        Promise.all(promises)
            .then( () => { resolve(commits); });
    });
};


function getFirstCommitInRange(commits) {
    return commits.reduce( (acc, cur) => {
        if (moment(acc.commit.committer.date).isBefore(cur.commit.committer.date)) {
            return acc;
        } else {
            return cur;
        }
    });
}

function getCommits(repo, options) {
    return repo.listCommits(options)
        .catch( (err) => {
            debug('Got error back from Github %o', err);
            return { data: [] };
        });
}

function getNextCommits(repo, buildup=[], options={}) {
    return getCommits(repo, options).then( res => {
        if (1>=res.data.length) {
            return buildup.concat(res.data);
        } else {
            let first = getFirstCommitInRange(res.data);
            return getNextCommits(repo,
                                  buildup.concat(res.data),
                                  {until: first.commit.committer.date });
        }
    })
        .catch(debug);
}

const listAllCommits = (repo) => {
    return getNextCommits(repo)
        .then( res => {
            return { data: res };
        });
};

/**
 * Search github for the events associated with a project
 * Currently extracts: Forks, Commits, Tags
 */
function getEvents(project) {
    return getRepo(project)
        .then(PassThrough( (repo) => { return repo.listForks()
                                      .then( store(project, 'Fork', ['pushed_at', 'created_at', 'updated_at']) ); }))
        .then(PassThrough( (repo) => { return repo.listTags()
                                      .then( extractTagTime(repo) )
                                      .then( store(project, 'Tag', ['commit_at']) ); }))
        .then(PassThrough( (repo) => { return listAllCommits(repo) // TODO: This seems to be limited to last 30, or last 2.5 years, or something like that. Fix this...
                                      .then( extractCommitTime )
                                      .then( extractCommitDetails(repo) )
                                      .then( store(project, 'Commit', ['author_at', 'commit_at']) );
                                    }))
        .catch( debug );
}

/** Main function for this module -- extracts each type of interesting statistics for a project */
module.exports.collect = (project) => {
    return Promise.resolve(project)
        .then( PassThrough( (p) => {
            debug('Trawling %s', p.name);
        }))
        .then( PassThrough( getIssues ))
        .then( PassThrough( getEvents ))
        .catch(debug);
};

module.exports.cleanup = () => {
    let dbComponents = require('../db/npmComponents.js');
    
    return dbComponents.find({componentDetailsState: {$exists:true}}).exec()
        .then( (updated) => {
            updated.forEach( (e) => {
                Timeseries.find({project:e.name}).then( (res) => {
                    if (0 == res.length) {
                        debug('%s appears to be empty. Resetting it...', e.name);
                        dbComponents.findOneAndUpdate(
                            {name:e.name},
                            {$unset: {componentDetailsState:''}},
                            {new: true}).exec();
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


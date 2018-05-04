var debug = require('debug')('orion-gamma:statsCollector-github');
var handlers = require('../utils/handlers');

var db = require('../db/db-setup');
var dbComponentDetails = require('../db/componentDetails.js');   
var Timeseries = require('../db/timeseries.js');

var npmHandler = handlers.getHandler('npm');
var Github = require('github-api');
var ghApi = new Github();
// {
//     username: 'mickesv',
//     password: ''}); // use this when hitting rate-limits on github


function MaybeDo(res, project, tactic) {
    if (null == res) {
        return tactic(project);
    } else {
        return res;
    }
}

const PassThrough = fn => d => {
    fn(d);
    return d;
};


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
            t.save();
        });
    });                               
};

function getRepoPreexist(project) {
    if (project.repository &&
        project.repository.url) {
        return project.repository.url;
    } else {
        return null;
    }
}

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

function getRepoGithub(project) {
    // TODO search in github
    return {
        repository: {
            url: 'https://github.com/user/project.git'
        }};
}

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

function getUserAndRepo(url) {
    let ur = cleanURL(url).split('/'); 
    return {user:ur[0], repo:ur[1]};
}

function getRepoCredentials(project) {
    return Promise.resolve()
        .then( ()    => { return MaybeDo(getRepoPreexist(project), project, getRepoNPM); })
        .then( (res) => { return MaybeDo(res, project, getRepoGithub); })
        .then( PassThrough( (res) => { project.repository = {url:res}; }))
        .then( getUserAndRepo )
        .catch( debug );
}

function getRepo(project) {
    return getRepoCredentials(project)
        .then( (res) => { return ghApi.getRepo(res.user, res.repo); });
}

function getIssues(project) {
    return getRepoCredentials(project)
        .then( (res) => {
            return ghApi.getIssues(res.user, res.repo)
                .listIssues({sort: 'updated',
                             state: 'all'});
        })
        .then( store(project, 'Issue', ['created_at', 'updated_at', 'closed_at']) );    
}

function extractCommitTime(commits) {
    commits.data.forEach( (c) => {
        c.author_at = c.commit.author.date;
        c.commit_at = c.commit.committer.date;
    });

    return commits;
}

const extractTagTime = (project) => (tags) => {
    return new Promise( (resolve, reject) => {
        let promises = [];
        tags.data.forEach( (t) => {
            promises.push(getRepo(project)
                          .then( (res) => { return res.getCommit(t.commit.sha); })
                          .then( (res) => {
                              t.commit_at = res.data.committer.date;
                          }));
        });

        Promise.all(promises)
            .then( () => { resolve(tags); });
    });
};

function getEvents(project) {
    return getRepo(project)
        .then( PassThrough( (res) => { return res.listForks()
                                       .then( store(project, 'Fork', ['pushed_at', 'created_at', 'updated_at']) ); }))
        .then( PassThrough( (res) => { return res.listCommits()
                                       .then( extractCommitTime )
                                       .then( store(project, 'Commit', ['author_at', 'commit_at']) ); }))
        .then( PassThrough( (res) => { return res.listTags()
                                       .then( extractTagTime(project) )
                                       .then( store(project, 'Tag', ['commit_at']) ); }))
             ;
}

module.exports.collect = (project) => {
    return Promise.resolve(project)
        .then( PassThrough( getIssues ))
        .then( PassThrough( getEvents ))
        .catch(debug);
};

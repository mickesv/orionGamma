/**
 * Present the (already collected) statistics for a project
 * @module StatsCollector/mainStats.js
 * TODO: quiche is a very limited chart library. Wrap your head around google chart API and do it proper instead!
 */

var debug = require('debug')('orion-gamma:statsCollector-renderer');
var dateFormat = require('dateformat');
var moment = require('moment');

var db = require('../db/db-setup');
var TSeries = require('../db/timeseries.js');
var dbComponents = require('../db/npmComponents.js');

const {MaybeDo, PassThrough, ForEach} = require('../utils/promiseUtils.js');

const CHARTWIDTH = 600;
const CHARTHEIGHT = 400;

function findDistinctProjects() {
    return TSeries.distinct('project');
};

const getEvents = (eventType, additionalFilters={}) => (project) => {
    debug('Getting %s events for %s', eventType, project);
    let query = {project:project};
    if (eventType) {
        query = Object.assign(query, {type:eventType});
    }

    query = Object.assign(query, additionalFilters);
        
    return TSeries.find(query)
        .sort({time:1});
};

function getEventsInRange(eventType, window, additionalFilters={}) {
    return Promise.resolve()
        .then( () => { return TSeries.find(Object.assign({
            project: window.project,
            type: eventType,
            time: {"$gte": window.startTime,
                   "$lte": window.endTime}},additionalFilters))
                       .sort({time: 1});
                     }) 
        .then( (events) => {
            window.events = window.events.concat(events);
            return window;
        } );
};

/* What is interesting to collect?

Tag: Tags have a time, and a sha (which can be used to find a commit)

- Graph: Time between tag (can indicate rising, declining, constant) (x:tag#, y:time) 
x- Average Time between tag

Commit: Two event types; author_at and commit_at (but mostly same timestamps for these)
x- Average Time between Commit
x- Average number of files touched ('tree') ?
- Median size of each commit
x- Number of different commit authors
- Graph: Time between commits

COMBINE Tag+Commit
- Each tag indicates a new t_0
- Each commit is relative to a tag_x: {c_1, c_2, ..., c_x, t_tx, c_x+1, c_x+2, ..., c_x+n, t_tx+1, ...}
- Graph: average time between commits for point in time t_tx+k

Fork

Issue
x- average close time
x- open issues
x- closed issues
- graph of open--closed dates.

*/

function getDurations(events, stats) {        
    let lastTime;
    let durations = [];
    let times = [];         // to get first and last time; assuming events are not necessarily time-ordered.
    events.forEach( (e) => {
        if (!(null == e.time)) {
            let time = moment(e.time);
            times.push(time);
            
            let duration=moment.duration(0);
            if(lastTime) {
                duration = moment.duration(time.diff(lastTime));
                durations.push(duration.clone()); // cloning since the subsequent reduce destroys the original durations
                lastTime=time;
            } else {
                lastTime=time;
                duration = moment.duration(0);
            };
            
            stats.events.push( {
                time: time,
                duration: duration.as('days'),
                event: e
                } );
        } else {
            debug('No time in Event %o', e);
        }
    });
    
    return {
        stats: stats,
        durations: durations,
        times: times};
};

function getFirstLast(retVal) {
    retVal.stats.first = moment.min(retVal.times);
    retVal.stats.last = moment.max(retVal.times);
    return retVal;
};

const LATEST = 5;
function getAverageDuration(retVal) {
    let length = 0;
    if (retVal.durations.length) {
        let sum = retVal.durations.reduce( (acc,cur) => {
            if (0 != cur) { length++; }; // Don't count both author_at and commit_at in the average time
            return acc.add(cur);
        });
        retVal.stats.averageDuration = moment.duration(sum/length).as('days');

        // Re-do this for the LATEST items
        if (retVal.durations.length > LATEST) {
            let latest = retVal.durations.slice(retVal.durations.length - (LATEST +1 ));
            let length = 0;
            let sum = latest.reduce( (acc,cur) => {
                if (0 != cur) { length++; }; // Don't count both author_at and commit_at in the average time
                return acc.add(cur);
            });
            retVal.stats.averageDurationLatest = moment.duration(sum/length).as('days');
            retVal.stats.averageDurationLatestSize = LATEST;
        } else {
            retVal.stats.averageDurationLatest = retVal.stats.averageDuration;
            retVal.stats.averageDurationLatestSize = retVal.durations.length;
        }                
    };

    return retVal;
};

const getBaseStats = (eventType) => (events) => {
    return new Promise( (resolve, reject) => {
        let stats = {
            eventType: eventType,
            first: 0,
            last: 0,
            averageDuration: moment.duration(0),
            events: []        
        };       
        
        // getDurations generates some side data, used by subsequent calls. The real results are always in retVal.stats.
        let retVal = getDurations(events, stats);
        retVal = getFirstLast(retVal);
        retVal = getAverageDuration(retVal);
        
        resolve(retVal.stats);
    });
};

function getAuthorList(stats) {
    // TODO: Github API has a method getContributors that does the same. Maybe I should use this instead, but that would cost me another API call.
    let authors=[];
    stats.events.forEach( c => {
        let author = undefined;
        if (c.event.data.committer) {
            author = c.event.data.committer.login;
        } else {
            // debug('null committer. Skipping...'); // TODO: FInd out why there are null committers.
        }
        if (authors[author]) {
            authors[author]++;
        } else {
            authors[author] = 1;
        }
    });
    stats.authorList = Object.keys(authors); // Splitting into two lists so that it survives transfer to the client side later on.
    stats.authorCommitCount = Object.values(authors);
    return stats;
}

function getCommitSizes(stats) {
    // TODO: Add median sizes as well.
    let avgStats= {
        total:0,
        additions:0,
        deletions:0,
        count:0
    };
    
    stats.events.forEach( e => {
        let details=e.event.data.details.stats;
        avgStats.total += details.total;
        avgStats.additions += details.additions;
        avgStats.deletions += details.deletions;
        avgStats.count++;

        e.totalCommitSize = details.total;
    });

    avgStats.total /= avgStats.count;
    avgStats.additions /= avgStats.count;
    avgStats.deletions /= avgStats.count;    
    stats.averageCommitSize = avgStats;
    
    return stats;
}

const getCommitStats = (events) => {
    return getBaseStats('Commit')(events)
        .then( getAuthorList )
        .then( getCommitSizes )
        .catch( debug );
};

function getUniqueIssues(events) {
    let issues=[];
    events.forEach( e => {
        if (!issues[e.data.id]) {
            issues[e.data.id] = {
                type: 'Issue',
                id: e.data.id
            };
        };
        
        issues[e.data.id] = Object.assign(
            issues[e.data.id],
            {
                title: e.data.title,
                state: e.data.state,
                created_at: e.data.created_at,
                closed_at: e.data.closed_at,
                comments: e.data.comments,
                body: e.data.body
            });
    });
    return Object.values(issues);
};

const getIssueStats = (events) => {
    return new Promise( (resolve, reject) => {
        let issues = getUniqueIssues(events);

        let openIssues = issues.filter( e => {
            return ('closed' != e.state); 
        });

        let closedIssues = issues.filter( e => {
            return ('closed' == e.state); 
        });

        let durations=[];
        closedIssues.forEach( e => {
            let created_at=moment(e.created_at);
            let closed_at=moment(e.closed_at);
            let duration=moment.duration(closed_at.diff(created_at)); // Note similarity with getDurations. TODO: Refactor?
            durations.push(duration.clone());
        });
        
        let stats = {
            eventType: 'Issue',
            averageDuration: moment.duration(0),
            openIssues: openIssues.length,
            closedIssues: closedIssues.length,
            issues: issues,
            events: events
        };
        let retVal = getAverageDuration({stats: stats,
                                         durations:durations});

        resolve(retVal.stats);
    });
};

function getComponentDetails(projectName) {
    let details = {
        eventType: 'projectName',
        ProjectName:projectName,
        SafeName: projectName.replace(/\./g, '-')
    };
    

    dbComponents.findOne({name:projectName}).exec()
        .then( res => {
            if (res.componentDetails) {
                details = Object.assign(details, res.componentDetails);
                debug('Found Component Details for %s', projectName);
                
            } else {
                debug('No Component Details for %s', projectName);
            };
        });
    
    return details;
};


const minimizeData = (projectName) => (response) => {
    debug('Raw response for %s is %d bytes. Mimnimizing...',
          projectName,
          JSON.stringify(response).length);
    
    response.map(itemType => {
        if(itemType.events) {
            itemType.events.map(e => {
                if (e.data) { e.data=null; };
                if (e.event.data) { e.event.data=null; };
            });
        };
    });

    debug('Minified response is %d bytes',
          JSON.stringify(response).length);

    return response;
};


const getProjectStats = (projectName) => {
    let promises = [];
    promises.push(Promise.resolve(projectName)
                  .then( getComponentDetails ));
    promises.push(Promise.resolve(projectName)
                  .then( getEvents('Tag') )
                  .then( getBaseStats('Tag') ));
    promises.push(Promise.resolve(projectName)
                  .then( getEvents('Commit') )
                  .then( getCommitStats ));
    promises.push(Promise.resolve(projectName)
                  .then( getEvents('Issue') )
                  .then( getIssueStats ));
    promises.push(Promise.resolve(projectName)
                  .then( getEvents('Fork', {event:'created_at'}) )
                  .then( getBaseStats('Fork') ));
    
    return Promise.all(promises)
        .then( minimizeData(projectName) )
        .catch( debug );
};

// TODO: I can probably do something with forks as I do with issues, to get the "liveliness" of a fork. At least, I can correlate created_at and updated_at... Not sure what updated_at means, though. Is it a 'pull', or is it a 'commit' on that fork?

module.exports.getProjectStats = getProjectStats;

module.exports.getAll = () => {
    // TODO: Cache results once done so I don't have to dance on every query.
    return Promise.resolve()
        .then( findDistinctProjects )
        .then( PassThrough( (res) => { debug('Distinct Projects: %o', res); }))
        .then( ForEach( getProjectStats ))
        //.then( PassThrough( debug ) )
        .catch( debug );
};

var debug = require('debug')('orion-gamma:quickLook-processing');
var moment = require('moment');
var ranges = require('./assessmentRanges.js');

const {sleep, MaybeDo, PassThrough} = require('../utils/promiseUtils.js');
const {debugError, TIMERANGE} = require('./utils.js');

// ------------------------------
// Process for further distribution
function getMomentArray(list, attribute='time') {
    let out=[];
    list.map(i => {
        out.push(moment(i[attribute]));
    });
    
    return out;
};

function getMomentIssueArray(list) {
    let out= [];
    list.map(i => {
        let created = moment(i.created_at);

        let closed = null;
        if (i.closed_at) {
            closed = moment(i.closed_at);
        };
       
        out.push({
            created_at: created,
            closed_at: closed
        });
    });
        
    return out;
};


function getSortedMomentArray(list, attribute='time') {
    let sorted = getMomentArray(list, attribute);
    sorted.sort( (l,r) => {
        return l.diff(r);
    });

    return sorted;
};

function getFirst(list, attribute='time') {
    return moment.min(getMomentArray(list, attribute));    
};

function getLast(list, attribute='time') {
    return moment.max(getMomentArray(list, attribute));    
};

function getAverageTimeBetween(list, attrbute='time') {
    let inArray = getSortedMomentArray(list, attrbute);
    let prevDate = false;
    let sum = 0;

    inArray.forEach(d => {
        if(prevDate) {
            sum += d.diff(prevDate);
        };
        prevDate = d;
    });
    
    return (moment.duration(sum/inArray.length).humanize());
};

function getAverageClosingTime(list) {
    let inArray = getMomentIssueArray(list);
    let duration = 0;
    let length = 0;

    inArray.forEach(d => {
        if (d.closed_at && d.created_at) {
            length++;
            duration += moment.duration(d.closed_at.diff(d.created_at));
        };
    });

    return (moment.duration(duration/length).humanize());
};


function formatAssessedActivity(verbose, numerical) {
    return {
        verbose: verbose,
        numerical: numerical
    };
};

function assessActivity(item,range) {
    let statement = 'unknown';
    let max = 0;

    Object.keys(range).forEach( test => {
        if (max < range[test].Amount) {
            max = range[test].Amount;
        }
        
        if (item.Amount > range[test].Amount ||
            item.Average < range[test].Average) {
            statement = test;
        };
    });

    
    max = Math.max(...[item.Amount, max]);
    let numerical = Math.floor(100*item.Amount / max);
    
    item['AssessedActivity'] = formatAssessedActivity(statement, numerical);
    return item;
};

function assessIssueActivity(item, range) {
    item.AssessedActivity = {};

    // TODO: Should 'Created' be inverted?
    // TODO: Analysis of average closing time for issues
    // TODO: Refactor to avoid code clones (with assessActivity)

    let keys = ['Created' , 'Closed'];
    
    keys.forEach(key => {

        let statement = 'unknown';
        let max = 0;

        Object.keys(range).forEach( test => {
            if (max < range[test].Amount) {
                max = range[test].Amount;
            }
            
            if (item.Amount > range[test].Amount ||
                item.Average[key] < range[test].Average[key]) {
                statement = test;
            };
        });

        max = Math.max(...[item.Amount, max]);
        let numerical = Math.floor(100*item.Amount / max);
        
        item.AssessedActivity[key] = formatAssessedActivity(statement, numerical);
    });
    
    return item;    
};
             
const defaultProcessor = (type, range) => (list) => {
    let out = {
        Type: type,
        Amount: list.length,
        First: getFirst(list),
        Last: getLast(list),
        Average: getAverageTimeBetween(list)
    };

    return assessActivity(out, range);
};


const issueProcessor = (type, range) => (list) => {
    let out= {
        Type: type,
        Amount: list.length,
        First: {
            Created: getFirst(list, 'created_at'),
            Closed: getFirst(list, 'closed_at')
        },
        Last:{
            Created: getLast(list, 'created_at'),
            Closed: getLast(list, 'closed_at')
        },
        Average:{
            Created: getAverageTimeBetween(list, 'created_at'),
            Closed: getAverageTimeBetween(list, 'closed_at'),
            Closing: getAverageClosingTime(list)
        }
    };
    return assessIssueActivity(out, range);
};

const processors = {
    Fork: defaultProcessor('Fork', ranges.defaultRange),
    Commit: defaultProcessor('Commit', ranges.commitRange),
    Tag: defaultProcessor('Tag', ranges.defaultRange),
    Issue: issueProcessor('Issue', ranges.issueRange)    
};

const processResults = (getDetailsPromise) => (rawResults) => {
    return getDetailsPromise.then( res => res[0] )
        .then( details => {
            details.data = {};

            // TODO refactor into two methods
            rawResults.map(resultSet => {
                if (resultSet && resultSet[0]) {
                    let type = resultSet[0].type;
                    debug('Processing type %s with length %d', type, resultSet.length);
                    if(processors[type]) {
                        let item = processors[type](resultSet);
                        details.data[type]=item;
                    };
                } 
            });

            // Fill up remaining with empty defaults
            Object.keys(processors).forEach(type => {
                if (!details.data[type]) {
                    details.data[type] = {
                        Type: type,
                        Amount: 0,
                        First: null,
                        Last: null,
                        Average: null,
                        AssessedActivity: {}
                    };
                    
                    if ('Issue' != type) {
                        details.data[type].AssessedActivity = formatAssessedActivity('low', 0);
                    } else {
                        debug('Special treatment for Issues');
                        details.data[type].AssessedActivity = {
                            Created: formatAssessedActivity('low', 0),
                            Closed:  formatAssessedActivity('low', 0),
                            Closing:  formatAssessedActivity('low', 999)
                        };
                    }
                }
            });

            return details;
        })
        .catch( debugError('Process Results', true) );
};


module.exports.processResults = processResults;

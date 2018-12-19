var debug = require('debug')('orion-gamma:ProjectStatesPopulator');
var db = require('../db/db-setup');
var assessments = require('../db/assessmentSummaries.js');
var fs = require('fs');
const fsp = fs.promises;
const {ForEach,PassThrough} = require('../utils/promiseUtils.js');

const FILEPATH='./ProjectStatesPopulator/';
const FILENAME='ProjectStates.csv';

function getLabels(includeAssessment=true) {
    let labels = Object.keys(assessments.schema.paths).filter(l => {
        return (!l.startsWith('_'));
    });

    if(!includeAssessment) {
        return labels.filter(l => {
            return('assessment' != l);
        });
    } else {
        return labels;
    }
};


function parseLine(line) {
    let elems=line.split(';');
    let labels=getLabels();
    let parsed = {};
    
    labels.forEach((l,index) => {
        parsed[l]=elems[index];
    });

    return parsed;
};

function parseAndStoreLine(line) {
    let lineObject=parseLine(line);
    let query={};
    getLabels(false).map(l => {
        query[l] = lineObject[l];
    });

    return assessments.findOneAndUpdate(query,
                                        lineObject,
                                        {new:true,
                                         upsert:true})
        .exec()
        .then( () => debug('Updated assessment %o', lineObject))
        .catch( err => {
            debug('Error while updating assessment: %s\nAssessment %o', err, lineObject);
        });
};

function parseAsLines(data) {
    let entries= data.split('\r');

    debug(getLabels(false));
    
    
    return entries.filter(e => {
        return (-1 == e.indexOf('---'));
    });
};

module.exports.readStatesFile = (filename) => {
    debug('Reading %s', filename);
    return fsp.readFile(filename, {encoding:'utf8'})
        .then( parseAsLines )
        .then( ForEach(parseAndStoreLine))
        .catch( debug );
}


module.exports.readStatesFile(FILEPATH+FILENAME);

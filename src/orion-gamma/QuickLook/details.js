var debug = require('debug')('orion-gamma:quickLook-details');
var moment = require('moment');

const {sleep, MaybeDo, PassThrough} = require('../utils/promiseUtils.js');
const {debugError} = require('./utils.js');

// ------------------------------
// Other Details
function cleanDetailsData(d) {
    let headers=['name',
                 'full_name',
                 'description',
                 'html_url',
                 'forks_count',
                 'stargazers_count',
                 'watchers',
                 'size',
                 'open_issues_count',
                 'topics',
                 'created_at',
                 'updated_at',
                 'network_count',
                 'license'];

    let result = {
        Type: 'Details',
        owner: d.owner.login // Special since it is nested
    };

    headers.map(h => {
        result[h] = d[h];
    });

    result.url = result.html_url;
    result.created_at = moment(result.created_at).format('YYYY-MM-DD');
    result.updated_at = moment(result.updated_at).format('YYYY-MM-DD');    
    
    return [result]; // Returning array for consistency with the others
};

const setSafeName = (name) => (result) => {
    result[0].safeName = name.replace(/[\.\@\/]/g, '-');
    debug('full name: %s  safe name: %s', result[0].full_name, result[0].safeName);
    return result;
};

const getDetails = (name) => (repo) => {
    return repo.getDetails()
        .then( res => res.data )
        .then( cleanDetailsData )
        .then( setSafeName(name) )    
        .catch( debugError('Get Details', true) );  
};

module.exports.getDetails = getDetails;

var async = require('async');
var debug = require('debug')('orion-gamma:controller');
var utils = require('../utils');

var Github = require('../utils/githubHandler'); // Special case, since I want more info from github repo.

module.exports.partialSearch = function(req, res) {
    var source = req.params.source;
    var name = req.query.search;
    debug('PartialSearch Source: %s Query: %o', req.params.source, req.query);

    utils.search(source, name, function(err, results) {
        if (err) {
            debug(err.message);
            return res.render('result', { results: []});
        }

        // debug('Received %s : %o ', source, results);
        return res.render('result', { results: results
                                    });
    });
};

module.exports.searchPage = function(req, res) {
    res.render('index', { handlers: utils.getHandlers()
                        });  
};


module.exports.displayComponent = function(req, res) {
    var source=req.params.source;
    var name=req.query.q;
    debug('Finding details for %s:%s', source, name);
    
    utils.getDetails(source, name, function(err, result) {
        // debug(result);

        let processedResults = processDetailsResults(result);
        let repoUrl = utils.getRepoUrl(source, result);
        debug(repoUrl);
        debug(processedResults);        
            
        res.render('component', { error: err,
                                  componentName: result.name,
                                  repoUrl: repoUrl,
                                  data: processedResults
                                });
    });

};


module.exports.getIssueActivity = function(req, res) {
    var name=req.query.q;
    var url =req.query.url;    
    debug('Finding Issue Activity for %s, with url %s', name, url);

    if (!url.search('github')) {
        return res.render('issueActivity', {error: {message: 'not a github url'}});
    } else {
        var urlComponents = url.split('/');
        var user = urlComponents[urlComponents.length-2];
        var repo = urlComponents[urlComponents.length-1];
        debug('User %s and repo %s', user, repo);
        var github=new Github();  

        github.getIssueActivity(user, repo, function(err, data) {
            if (err) {
                debug(err);
                return res.render('issueActivity', {issueActivity: []});
            } else {
                return res.render('issueActivity', {
                    avgClosingTime: data.avgClosingTime,
                    MAXLENGTH:data.MAXLENGTH,
                    issueActivity: data.data});
            }
        });                
    }    
};


function processDetailsResults(data) {
    var out=[];
    Object.keys(data).forEach(function (key) {
        var val = data[key];
        var keyName = capitalise(spacify(key));
        out.push({ key:keyName, val:val});
    });

    return out;
};


function spacify(input) {
    var out = '';
    var pos=0;
    var str = input;
    while ((pos != -1) &&
           (pos <= input.length)) {
        pos=str.substring(1).search('[A-Z]');        
        out = out + ' ' + str.substring(0, pos+1);        
        str = str.substring(pos+1);
    }

    out = out.substring(1) + str;    
    return out;
};

function capitalise(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

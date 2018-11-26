var async = require('async');
var debug = require('debug')('orion-gamma:controller');
var utils = require('../utils');

var Github = require('../utils/githubHandler'); // Special case, since I want more info from github repo.
var quickLook = require('../QuickLook');

var dispatcher = require('../dispatcher');
function dispatchTrawlers(source, items) {
    if ('npm' === source) {
        items.forEach( (e) => {
            debug('dispatching %s to %s', e.name, dispatcher.config.queues.components);
            dispatcher.push(dispatcher.config.queues.components, JSON.stringify(e));
        });
    }
};

module.exports.partialSearch = function(req, res) {
    let source = req.params.source;
    let name = req.query.search;
    let backdoor = req.query.backdoor;
    debug('PartialSearch Source: %s Query: %o', req.params.source, req.query);

    utils.search(source, name, function(err, results) {
        if (err) {
            debug(err.message);
            return res.render('result', { results: []});
        }

        // Add QuickTrawl URLs
        if (backdoor) {
            results.map( e => {
                e.trawlURL='/backdoor/quicktrawl/?q='+ e.name;
            });
        }
        
        // send the list of search results to worker nodes for trawling
        // dispatchTrawlers(source, results);
        
        // debug('Received %s : %o ', source, results);
        return res.render('result', { results: results,
                                      backdoor: backdoor
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
        //let processedResults = processDetailsResults(result);

        debug(result);
        
        if (!err) {
            let repoUrl = utils.getRepoUrl(source, result);
            debug('Repository URL is %s', repoUrl);
            if (repoUrl) {
                quickLook.getData(repoUrl)
                    .then(projectData => {
                        debug('Returning with:');
                        debug(projectData);
                        
                        res.render('component', { error: err,
                                                  componentName: result.name,
                                                  repoUrl: repoUrl,
                                                  data: projectData
                                                });
                    })
                    .catch( err => {
                        debug('Error %s', err);
                        res.render('component', { error: err });
                    });
            } else {
                debug('No URL found, returning with error');                            
                res.status(404).send('Could not find any URL for this project');
            }
        } else {
            debug('Error %s', err);            
            res.render('component', { error: err });
        }
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

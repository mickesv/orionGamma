var async = require('async');
var debug = require('debug')('orion-gamma:controller');

var npmUtil = require('../utils/npmUtil');
var githubUtil = require('../utils/githubUtil');

var projectName = 'Orion Gamma';

// Handlers
// --------------------
var searchHandler = {
    npm: npmUtil.search,
    github: githubUtil.search
};

var detailsHandler = {
    npm: npmUtil.getDetails
};

// --------------------

module.exports.partialSearch = function(req, res) {
    var source = req.params.source;
    var name = req.query.search;
    debug('PartialSearch Source: %s Query: %o', req.params.source, req.query);

    searchHandler[source](name, function(err, results) {
        if (err) {
            debug(err.message);
            return res.render('result', {title: projectName,
                                         results: []});
        }

        debug('Received %s : %o ', source, results);
        return res.render('result', {title: projectName,
                                     results: results
                                    });
    });
};

module.exports.searchPage = function(req, res) {
    res.render('index', { title: projectName,
                          handlers: Object.keys(searchHandler)
                        });  
};


module.exports.displayComponent = function(req, res) {
    var source=req.params.source;
    var name=req.params.name;

    debug('Finding details for %s:%s', source, name);
    
    detailsHandler[source](name, function(err, result) {
        debug(result);        
        res.render('component', { title: projectName,
                                  error: err,
                                  componentName: result.name,
                                  data: result
                                });
    });
};

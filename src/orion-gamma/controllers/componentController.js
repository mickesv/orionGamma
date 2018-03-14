var async = require('async');
var debug = require('debug')('orion-gamma:controller');
var utils = require('../utils');


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
        res.render('component', { error: err,
                                  componentName: result.name,
                                  data: result
                                });
    });
};

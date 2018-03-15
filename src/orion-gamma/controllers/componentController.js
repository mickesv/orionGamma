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

        var processedResults = processDetailsResults(result);
        debug(processedResults);
        
        res.render('component', { error: err,
                                  componentName: result.name,
                                  data: processedResults
                                });
    });
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

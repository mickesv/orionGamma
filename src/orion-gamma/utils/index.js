var debug = require('debug')('orion-gamma:utils');
var npmUtil = require('../utils/npmUtil');
var githubUtil = require('../utils/githubUtil');


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


module.exports.getHandlers = function() {
    return Object.keys(searchHandler);
};


function existsHandler(handlerName, handlers) {
    return module.exports.getHandlers(handlers).find(function (e) {
        return (e == handlerName);
    });
};

function callHandler(source, handlers, name, callback) {    
    if (existsHandler(source, handlers)) {
        return handlers[source](name, callback);
    } else {
        return callback({message: 'Can not find handler for ' + source}, []);
    }

}

module.exports.search = function(source, name, callback) {
    return callHandler(source, searchHandler, name, callback);
};

module.exports.getDetails = function(source, name, callback) {
    return callHandler(source, detailsHandler, name, callback);    
};

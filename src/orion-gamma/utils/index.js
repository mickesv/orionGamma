var debug = require('debug')('orion-gamma:utils');
var handlers = require('./handlers');


function getHandlers(theHandlers) {
    return Object.keys(theHandlers);
}

module.exports.getHandlers = function() {
    return getHandlers(handlers.searchHandler);
};


function existsHandler(handlerName, theHandlers) {
    return getHandlers(theHandlers).find(function (e) {
        return (e == handlerName);
    });
};

function callHandler(source, theHandlers, name, callback) {    
    if (existsHandler(source, theHandlers)) {
        return theHandlers[source](name, callback);
    } else {
        return callback({message: 'Can not find handler for ' + source}, []);
    }

}

module.exports.search = function(source, name, callback) {
    return callHandler(source, handlers.searchHandler, name, callback);
};

module.exports.getDetails = function(source, name, callback) {
    return callHandler(source, handlers.detailsHandler, name, callback);    
};

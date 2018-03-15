var debug = require('debug')('orion-gamma:utils');
var handlers = require('./handlers');



module.exports.getHandlers = function() {
    return handlers.getHandlerList();
};

module.exports.search = function(source, name, callback) {
    if(handlers.existsHandler(source)) {
        var handler=handlers.getHandler(source);
        return handler.search(name, callback);
    } else {
        debug('no handler found for ' + source);
        return callback({message: 'Can not find handler for ' + source}, []);
    }
};

module.exports.getDetails = function(source, name, callback) {
    if(handlers.existsHandler(source)) {
        var handler=handlers.getHandler(source);    
        return handler.getDetails(name, callback);
    } else {
        debug('no handler found for ' + source);        
        return callback({message: 'Can not find handler for ' + source}, []);
    }
};

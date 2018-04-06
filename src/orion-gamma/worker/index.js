var debug = require('debug')('orion-gamma:worker-main');
var dispatcher = require('../dispatcher');

module.exports.listen = function () {
    dispatcher.getWorker(dispatcher.config.queues.test).on('message', (msg, next, id) => {
        debug('Received Message %s', msg);
        dispatcher.push(dispatcher.config.queues.feedback, 'Received Message ' + msg);
        next();
    });
};




module.exports.listen(); // Start listening for incoming messages

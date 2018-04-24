var config = require('./dispatch-config');
var RedisSMQ = require('rsmq-promise');
var rsmq = new RedisSMQ({host: config.dispatcherHost});
var debug = require('debug')('orion-gamma:message-dispatcher');

module.exports.config = config;

function feedbackMessages(msg, next, id) {
    debug('Feedback from Workers: %s', msg);
    next();
}

module.exports.initiate = () => {
    return new Promise( (resolve, reject) => {
        var promises = [];
        
        Object.values(config.queues).forEach( (q) => {
            promises.push(
                rsmq.deleteQueue({qname:q})
                    .catch(err => {
                        debug('Queue %s not found? %s', q, err);
                    })
                    .then( resp => { return rsmq.createQueue({qname:q});})
                    .then( resp => {
                        debug('Created Queue: %s', q);
                    })
                    .catch(err => {
                        debug('FAILED to Create Queue: %s. Error: %o', q, err);
                    })
            );
        });

        Promise.all(promises)
            .catch(err => { reject(err); })        
            .then(done => {
                module.exports.getWorker(config.queues.feedback).on('message', feedbackMessages);
                resolve(done);
            });
    });
};

module.exports.sendTest = (iterations) => {
    return new Promise( (resolve, reject) => {
        iterations = iterations || 10;
        var promises= [];
        for(i=0; i <iterations; i++) {
            promises.push(
                module.exports.push(config.queues.test, 'Test message ' + i)
            );
        };
        Promise.all(promises)
            .then(done => { resolve(done); })
            .catch(err => { reject(err); });        
    });
};


module.exports.push=(queue, message) => {
    return rsmq.sendMessage({qname:queue, message: message});
};

module.exports.pop=(queue) => {
    return rsmq.popMessage({qname:queue});            
};

var RSMQWorker = require('rsmq-worker');

module.exports.getWorker = (queue) => {
    return new RSMQWorker(queue, {host:config.dispatcherHost,
                                  autostart:true});
};

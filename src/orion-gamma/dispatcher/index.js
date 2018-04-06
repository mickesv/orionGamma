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
                    .then( resp => { return rsmq.createQueue({qname:q});})
                    .then( resp => {
                        debug('Created Queue: %s', q);
                    })
                    .catch(err => {
                        debug('FAILED to Create Queue: %s. Error: %o', q, err);
                    })
            );
        });

        module.exports.getWorker('feedback').on('message', feedbackMessages);

        Promise.all(promises)
            .then(done => { resolve(done); })
            .catch(err => { reject(err); });
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

function findQueue(qName) {
    var q = config.queues[qName] || config.queues.feedback;
    return q;    
}

module.exports.push=(queue, message) => {
    let qname = findQueue(queue);
    return rsmq.sendMessage({qname:qname, message: message});
};

module.exports.pop=(queue) => {
    let qname = findQueue(queue);
    return rsmq.popMessage({qname:qname});            
};

var RSMQWorker = require('rsmq-worker');
var worker = null;

module.exports.getWorker = (queue) => {
    if (!worker) {
        worker = new RSMQWorker(queue, {host:config.dispatcherHost,
                                        autostart:true});
    }
    return worker;
};

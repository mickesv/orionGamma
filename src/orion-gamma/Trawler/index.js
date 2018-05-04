var debug = require('debug')('orion-gamma:worker-main');
var dispatcher = require('../dispatcher');
var npmTrawler = require('./npmTrawler');


function listenForTests(msg, next, id) {    
    debug('Received Message %s', msg);
    dispatcher.push(dispatcher.config.queues.feedback, 'Received Message ' + msg);
    next();    
}
                                    

function listenForComponents(msg, next, id) {
    let comp = JSON.parse(msg);
    let trawlLevel = comp['trawlLevel'] || 1;
    npmTrawler.trawlComponent(comp, trawlLevel)
        .then( () => { next(); });
}

function listenForKeywords(msg, next, id)  {
    let kw = JSON.parse(msg);
    let trawlLevel = kw['trawlLevel'] || 1;        
    npmTrawler.trawlKeyword(kw, trawlLevel)
        .then( () => { next(); });
}

module.exports.listen = function () {    
    dispatcher.getWorker(dispatcher.config.queues.test).on('message', listenForTests);
    dispatcher.getWorker(dispatcher.config.queues.components).on('message', listenForComponents);
    dispatcher.getWorker(dispatcher.config.queues.keywords).on('message', listenForKeywords);
};




module.exports.listen(); // Start listening for incoming messages

var async = require('async');
var debug = require('debug')('orion-gamma:controller-stats');
var stats = require('../StatsCollector/mainStats.js');

module.exports.main = (req, res) => {
    stats.getAll()
        .then( (data) => {
            return res.render('stats', { Projects: data });
        });
};

module.exports.displayProject = (req, res) => {
    stats.getProjectStats(req.params.name)
        .then( (data) => {
            return res.render('stats', { Projects: [data] });
        });

};

// Backdoor -- allow Trawling a single project
var utils = require('../utils');
var npmTrawler = require('../Trawler/npmTrawler.js');
var db = require('../db/db-setup');
var dbComponents = require('../db/npmComponents.js');
var ghCollector = require('../StatsCollector/githubCollector.js');

module.exports.quickTrawl = (req, res) => {
    let name = req.query.q;
    debug(name);
    npmTrawler.trawlComponent({name:name}, 0)
        .then( () => { ghCollector.resetProject(name); })
        .then( () => {
            return dbComponents.findOneAndUpdate(
                {name:name},
                {componentDetailsState:Date.now()},
                {new: true})
                .then(res => {
                    return ghCollector.collect(res);
                })
                .catch( debug );                        
        });

    return res.render('index', { handlers: utils.getHandlers(),
                                 backdoor: true,
                                 message: 'Trawling Project; This may take a while.',
                                 statsURL: '/stats/' + name
                               });
};

module.exports.quickTrawlSearch = (req, res) => {
    res.render('index', { handlers: utils.getHandlers(),
                          backdoor: true
                        });  
};

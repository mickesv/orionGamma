var async = require('async');
var debug = require('debug')('orion-gamma:controller-stats');
var stats = require('../StatsCollector/mainStats.js');


module.exports.main = (req, res) => {
    stats.getAll()
        .then( (data) => {
            return res.render('stats', { Projects: data });
        });
};


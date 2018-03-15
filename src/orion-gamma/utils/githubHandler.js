var debug = require('debug')('orion-gamma:github-api');
var Github = require('github-api');
var api = new Github();
var Handler = require('./handler.js');

module.exports = class GithubHandler extends Handler {
    constructor() {
        super();
    }
    
    search(name, callback) {
        debug('Search for ' + name);
        
        api.search({q: name}).forRepositories({}, function(err, res, req) {
            var result = [];
//            debug(res[0]);        
            if (!err) {
                res.forEach(function (elem) {
                    result.push({
                        origin: 'github',
                        name: elem.full_name,
                        description: elem.description,
                        url: '/component/github/?q=' + elem.full_name,
                        originUrl: elem.html_url
                    });
                });
            };
            
            callback(err, result);
        });        
    };
    
    getDetails(name, callback) {
        var user=name.split('/')[0];
        var repo=name.split('/')[1];
        debug('Getting details for user %s repo %s', user, repo);
        
        api.getRepo(user, repo).getDetails(function (err, res, req) {
//            debug(res);

            callback(null, {});
        });
    };
};

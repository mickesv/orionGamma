var Github = require('github-api');
var debug = require('debug')('orion-gamma:github-api');
var api = new Github();

module.exports.search = function(name, callback) {
    debug('Search for ' + name);

    api.search({q: name}).forRepositories({}, function(err, res, req) {
        var result = [];
        debug(res[0]);        
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

module.exports.getDetails = function(name, callback) {
    debug('Getting details for ' +name);

    
    // return api.getdetails(name, function(data) {
    //     var result={
    //         origin: 'npm',
    //         name: name,
    //         url: '/component/npm/' + name
    //     };
    //     if (!data.error) {
    //         var res= {
    //             description: data.description,
    //             author: data.author.name,
    //             authorContact: data.author.email,
    //             versions: Object.keys(data.versions).length,
    //             lastVersion: data['dist-tags'].latest,
    //             lastVersionDate: dateFormat(data.time[data['dist-tags'].latest],'yyyy-mm-dd'),
    //             repository: data.repository.url.split('+')[1],
    //             homepage: data.homepage,
    //             license: data.license                
    //         };

    //         Object.assign(result, res);
    //     }        
    //     callback(null,result);
    // });      
};

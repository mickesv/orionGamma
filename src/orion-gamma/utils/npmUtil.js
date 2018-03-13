var api = require('api-npm');
var dateFormat = require('dateformat');
var debug = require('debug')('orion-gamma:npm-api');


module.exports.search = function(name, callback) {
    name = name.split(' ')[0];
    debug('Search for ' + name);
    return api.getstat(name, '1970-01-01', dateFormat(Date.now(), 'yyyy-mm-dd'), function(data) {
        var result=[];
        
        if (!data.error) {        
            
            result.push({
                origin: 'npm',
                name: data.package,
                url: '/component/npm/' + data.package
            });
        }
        
        callback(null, result);
    });
};

module.exports.getDetails = function(name, callback) {
    debug('Getting details for ' +name);
    return api.getdetails(name, function(data) {
        var result={
            origin: 'npm',
            name: name,
            url: '/component/npm/' + name
        };
        if (!data.error) {
            var res= {
                description: data.description,
                author: data.author.name,
                authorContact: data.author.email,
                versions: Object.keys(data.versions).length,
                lastVersion: data['dist-tags'].latest,
                lastVersionDate: dateFormat(data.time[data['dist-tags'].latest],'yyyy-mm-dd'),
                repository: data.repository.url.split('+')[1],
                homepage: data.homepage,
                license: data.license                
            };

            Object.assign(result, res);
        }        
        callback(null,result);
    });      
};

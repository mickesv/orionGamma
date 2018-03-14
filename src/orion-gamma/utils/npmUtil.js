var api = require('api-npm');
var dateFormat = require('dateformat');
var debug = require('debug')('orion-gamma:npm-api');

var https = require('https');

var npmdata = {
    url: 'registry.npmjs.org',
    search: '/-/v1/search',
    queryRoot: '?text='
};

function npmSearch(packageName, callback) {
    // styled after the code in api-npm
    return https.get({
        host: npmdata.url,
	      path: npmdata.search + npmdata.queryRoot + packageName
    },function(response){
        var body ='';
	      response.on('data',function(d){
	          body +=d;
	      });
        response.on('end',function(){
            var parse = JSON.parse(body);
            //console.log(parse);
            callback(parse);
        });
    });
};

module.exports.search = function(name, callback) {
    name = name.split(' ')[0];
    debug('Search for ' + name);
    return npmSearch(name, function(data) {
        var result=[];

        debug(data);
            
        if (!data.error) {
            data.objects.forEach(function(elem) {
                debug(elem.package);
                result.push({
                    origin: 'npm',
                    name: elem.package.name,
                    description: elem.package.description,
                    url: '/component/npm/?q=' + elem.package.name,
                    originUrl: elem.package.links.npm
                });
            });
        }
        
        return callback(null, result);
    });
};

module.exports.getDetails = function(name, callback) {
    debug('Getting details for ' +name);
    return api.getdetails(name, function(data) {
        var result={
            origin: 'npm',
            name: name,
            url: '/component/npm/?q=' + name
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
        callback(data.error,result);
    });      
};

var api = require('api-npm');
var dateFormat = require('dateformat');
var debug = require('debug')('orion-gamma:npm-api');
var https = require('https');

var Handler = require('./handler');

module.exports = class NPMHandler extends Handler {

    constructor() {
        super();
        this.npmdata = { url: 'registry.npmjs.org',
                         search: '/-/v1/search',
                         queryRoot: '?text=',
                         packageRoot: 'https://www.npmjs.org/package/'
                       };
    };
        
    search(name, callback) {
        name = name.split(' ')[0];
        debug('Search for ' + name);
        return this.npmSearch(name, function(data) {
            var result=[];
            
            if (!data.error) {
                data.objects.forEach(function(elem) {
                    result.push({
                        origin: 'npm',
                        name: elem.package.name,
                        description: elem.package.description,
                        url: '/component/npm/?q=' + elem.package.name,
                        originUrl: elem.package.links.npm
                    });
                });
            }
            
            return callback(data.error, result);
        });
    };

    getRawDetails(name, callback) {
        return api.getdetails(name, (data) => {
            if (data.error) {
                data.error += ' ' + name;
            }
            callback(data.error, data);
        });
    };

    getDetails(name, callback) {
        debug('Getting details for ' +name);
        var that=this;
        return api.getdetails(name, function(data) {
            var result={
                name: name,                
                origin: 'npm',
                originUrl: that.npmdata.packageRoot + name
            };
            if (!data.error) {
                var res = {
                    description: data.description,
                    author: (data.author)?data.author.name:'',
                    authorContact: (data.author)?data.author.email:'',
                    versions: Object.keys(data.versions).length,
                    lastVersion: data['dist-tags'].latest,
                    lastVersionDate: dateFormat(data.time[data['dist-tags'].latest],'yyyy-mm-dd'),
                    repository: data.repository.url.split('+')[1],
                    homepage: data.homepage,
                    keywords: data.keywords,
                    license: data.license                
                };

                Object.assign(result, res);
            }        
            callback(data.error,result);
        });      
    };

    getRepoUrl(data) {
        let repoName = data.repository || data.homepage || '';
        if (repoName.endsWith('.git')) {
            repoName = repoName.substring(0, repoName.length -4);
        }

        return repoName;
    }
    
    // --------------------
    npmSearch(packageName, callback) {
        // styled after the code in api-npm
        return https.get({
            host: this.npmdata.url,
	          path: this.npmdata.search + this.npmdata.queryRoot + packageName
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

};

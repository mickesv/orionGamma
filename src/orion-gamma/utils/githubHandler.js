var debug = require('debug')('orion-gamma:github-api');
var Github = require('github-api');
var api = new Github();
var dateformat = require('dateformat');
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
            var result={
                name: name,                
                origin: 'github',
                originUrl: 'https://www.github.com/' + name
            };
            
            debug(res);            
            if(!err) {
                var details= {
                    originUrl: res.html_url,                    
                    description: res.description,
                    author: res.owner.login,
                    authorHomepage: res.owner.html_url,
                    lastActivity: dateformat(res.pushed_at, 'yyyy-mm-dd'),
                    openIssuesCount: res.open_issues_count,
                    license: res.license?res.license.name:'undefined'
                };
                Object.assign(result,details);
            }

            return callback(err, result);
        });
    };

    getIssueActivity(user, repo, callback) {
        debug('Getting issue Activities for user %s repo %s', user, repo);
        var MAXLENGTH=20;
        var that=this;
        
        api.getIssues(user, repo)
            .listIssues({sort: 'updated',
                        state: 'all'},
                       function(err, res, req) {
                           var result = {avgClosingTime:0,
                                         MAXLENGTH:MAXLENGTH,
                                         data:[]};
                           if(!err) {
                               result.avgClosingTime=that.getAvgClosingTime(res);
                               
                               let len = (res.length>MAXLENGTH)?MAXLENGTH:res.length;
                               for (var i=0; i < len; i++) {
                                   let issue=res[i];
                                   result.data.push({
                                   number: issue.number,
                                   title: issue.title,
                                   state: issue.state,
                                   created_at:dateformat( issue.created_at, 'yyyy-mm-dd'),
                                   updated_at:dateformat( issue.updated_at, 'yyyy-mm-dd'),
                                   closed_at: dateformat( issue.closed_at,  'yyyy-mm-dd')
                                   });
                               };
                           } else {
                               debug(err);
                           };
                           return callback(err, result);
                       });
    };

    getAvgClosingTime(data) {
        debug('AvgClosingtime');
        var duration=0;        
        data.forEach(function (i) {
            let start = new Date(i.created_at);
            let end = new Date(i.closed_at || i.updated_at);
            duration += new Date(end.getTime() - start.getTime()).getTime();
        });

        duration = duration / data.length;

        let year = dateformat(duration, 'yy') - 70;        
        return {days: dateformat(duration, 'd'),
                months: dateformat(duration, 'm'),
                years: year
               };
    }

    getRepoUrl(data) {
        return data.originUrl;
    }

};

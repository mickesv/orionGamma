var debug = require('debug')('orion-gamma:quickLook-outputFormatting');
var moment = require('moment');

const {sleep, MaybeDo, PassThrough} = require('../utils/promiseUtils.js');
const {debugError} = require('./utils.js');

function badgeify(p) {
    return Promise.resolve(p)
        .then(project => {
            project.badges={
                stargazers:{
                    tag: 'Stargazers',
                    value: project.stargazers_count}, 
                created_at: {
                    tag: 'Creation Date',
                    value: project.created_at},
                updated_at: {
                    tag: 'Last Updated',
                    value: project.updated_at}
                
            };
            project.linkBadges={
                url:{
                    tag: 'Project Home',
                    value: project.full_name,
                    url: project.url}};

            if (project.license) {
                project.linkBadges.license={
                    tag: 'License',
                    value: project.license.name,
                    url: project.license.url};
            } else {
                project.linkBadges.license={
                    tag: 'License',
                    value: 'unknown',
                    url: 'https://html5zombo.com'}; // TODO: get serious.
            }
            
            return project;
        })
        .catch( (err) => {
            debugError('Badgeify', false)(err);
            return p;
        });
};

function gatherChartData(p) {
    return Promise.resolve(p)
        .then(project => {            
            project.chartData = {
                Commits: project.data.Commit.AssessedActivity.numerical,
                Tags: project.data.Tag.AssessedActivity.numerical,
                Created_issues: project.data.Issue.AssessedActivity.Created.numerical,
                Closed_issues: project.data.Issue.AssessedActivity.Closed.numerical,
                Forks: project.data.Fork.AssessedActivity.numerical
            };
            
            return project;
        })
        .catch( err => {
            debugError('Gathering Chart Data', false)(err);
            return p;
        });
};


module.exports.badgeify = badgeify;
module.exports.gatherChartData = gatherChartData;

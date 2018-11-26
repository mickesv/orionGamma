/* Assumptions
 Medium Project
  - 5 developers, 100-1000 users
  - 200 issues created /6 months
  - Closing issues at the same rate
  - closing one issue per day
*/
module.exports.issueRange={ 
    low: {Amount:-1,
          Average:{
              Created:999,
              Closed:999,
              Closing:999}},
    medium: {Amount:100,
             Average: {
              Created:5,
              Closed:5,
              Closing:5}},
    high: {Amount:300,
           Average: {
               Created:1,
               Closed:1,
               Closing:1}}
};


/* Assumptions
 Medium Project:
 - 5 people
 - each commits once per day
 - SUM: 5*30*6 = 900 commits in six months
 - Allow +/- 50% on this

 - OR: at most 5 days between each commit.
 
 Large Project:
  - More than 50% larger than medium project
  - at least a commit per day

HOWEVER
 To speed things up, only CUTOFFCOMMIT (=500) are collected
 Medum project is thus 100 -- 400 commits
*/
module.exports.commitRange={ 
    low: {Amount:-1,
          Average:999},
    medium: {Amount:100,
             Average: 10},
    high: {Amount:400,
           Average: 3}
};


// Assumes there is a cap of 30 entries.
module.exports.defaultRange={
    low: {Amount:-1,
          Average:999},
    medium: {Amount:10,
             Average: 20},
    high: {Amount:20,
           Average: 5}
};

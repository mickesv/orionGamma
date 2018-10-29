
window.chartColors = {
	red: 'rgb(255, 99, 132)',
	orange: 'rgb(255, 159, 64)',
	yellow: 'rgb(255, 205, 86)',
	green: 'rgb(75, 192, 75)',
	blue: 'rgb(54, 162, 235)',
	purple: 'rgb(153, 102, 255)',
	grey: 'rgb(201, 203, 207)'
};

const graphOptions= {
    title: {
        text: 'Project Pulse',
        display: true
    },
    elements: {
        line: {
            tension: 0
        }                
    },
    scales: {
        xAxes: [{
            type: 'time',
            distribution: 'linear',
            barThickness: 5,
            ticks: {
                source: 'labels',
                autoSkip: false
            },
            time: {
                parser: 'YYYY-MM-DD'
            },
            scaleLabel: {
                display:true,
                labelString: 'Date'
            },
            gridLines: {
                display: false
            }
        }],
        yAxes: [{
            scaleLabel: {
                display:true,
                labelString: 'Additions and Deletions'
            },
            gridLines: {
                display: false
            },
            position: 'left',
            id: 'commit'
        },
                {
                    scaleLabel: {
                        display:true,
                        labelString: 'Open Issues'
                    },
                    gridLines: {
                        display: false
                    },                    
                    position: 'right',
                    id: 'issue'
                }]
    }
};

const barColours={
    tag: window.chartColors.orange,
    commit: window.chartColors.blue,
    issue: window.chartColors.red
};

function drawChart(projectName, tags, commits, issues) {
    // TODO: Push lots of this to server-side, so all I have to do is throw in a "data" object into the chart
    // TODO: refactor into at least two methods
    
    let context=document.getElementById(projectName+'-Graph').getContext('2d');

    let allEvents=tags.events.concat(commits.events);
    allEvents = allEvents.concat(issues.events);
    let commitData = [];
    let tagData = [];
    let issueData = [];
    let openCount = 0;
    const tagPosition = commits.averageCommitSize.total;
    allEvents.forEach( e => {
        if (e.time) {
            e.t=e.time;        
            if (e.event && 'Commit' == e.event.type) {
                e.y=e.totalCommitSize;
                commitData.push(e);
            } else if (e.event && 'Tag' == e.event.type) {
                e.y=tagPosition;
                tagData.push(e);
            } else if (e.type && 'Issue' == e.type) {
                if ('created_at' == e.event) {
                    openCount++;
                } else if('closed_at' == e.event) {
                    openCount--;
                }
                e.y=openCount;
                issueData.push(e);
            }
        }
        // console.log(e.t + ' : ' + e.y);
    });    
    
		let color = Chart.helpers.color;    
    let myChart=new Chart(context, {
        type:'line',
        data: {
            labels: allEvents,
            datasets: [
                {
                    label: 'Tags',
                    showLine: false,
                    pointRadius: 10,
                    type: 'line',
                    backgroundColor: color(barColours.tag).alpha(0.5).rgbString(),
					          borderColor: barColours.tag,
                    yAxisID: 'commit',                    
                    data:tagData
                },
                {
                    label: 'Commit Size',
                    type: 'bar',
                    backgroundColor: color(barColours.commit).alpha(0.5).rgbString(),
					          borderColor: barColours.commit,
                    yAxisID: 'commit',                                        
                    data: commitData
                },
                {
                    label: 'Open Issues',
                    type: 'line',
                    fill: false,
                    backgroundColor: color(barColours.issue).alpha(0.5).rgbString(),
					          borderColor: barColours.issue,
                    yAxisID: 'issue',                                        
                    data:issueData                    
                }]
        },
        options: graphOptions
    });    
};

function printTags(projectName, tags) {
    let data = '<H2>Tags</H2><ul>';
    data += '<li>First Tag: ' + moment(tags.first).format('YYYY-MM-DD');
    data += '<li>Last Tag: ' + moment(tags.last).format('YYYY-MM-DD');
    data += '<li>Number of Tags: ' +tags.events.length;
    data += '<li>Average Time between Tags: ' + moment.duration(tags.averageDuration,'days').humanize();
    data += '<li>Average Time between last ' + tags.averageDurationLatestSize + ' Tags: ' + moment.duration(tags.averageDurationLatest,'days').humanize();    
    data += '</ul>';

    $('#' + projectName + '-Tags').html(data);
}

function printCommits(projectName, commits) {
    let data = '<H2>Commits</h2><ul>';
    data += '<li>First Commit: ' + moment(commits.first).format('YYYY-MM-DD');
    data += '<li>Last Commit: ' + moment(commits.last).format('YYYY-MM-DD');;
    data += '<li>Average Time between Commits: ' + moment.duration(commits.averageDuration,'days').humanize();
    data += '<li>Average Time between last ' + commits.averageDurationLatestSize + ' Commits: ' + moment.duration(commits.averageDurationLatest,'days').humanize();
    data += '<li>Average Commit Size';
    data += '<ul><li>Total: ' + parseFloat(commits.averageCommitSize.total).toFixed(2);
    data += '<li>Additions: ' + parseFloat(commits.averageCommitSize.additions).toFixed(2);
    data += '<li>Deletions: ' + parseFloat(commits.averageCommitSize.deletions).toFixed(2);
    data += '</ul>';
    data += '<li>Authors: <ul>';
    commits.authorList.forEach( e => {
        data +='<li>' + e;
    });
    data += '</ul>';
    data += '</ul>';

    $('#' + projectName + '-Commits').html(data);    
}

function printIssues(projectName, issues) {
    let data = '<H2>Issues</H2><ul>';
    data += '<li>Currently Open Issues: ' + issues.openIssues;
    data += '<li>Closed Issues: ' + issues.closedIssues;
    data += '<li>Average Closing Time of Issues: ' + moment.duration(issues.averageDuration,'days').humanize();
    data += '<li>Average Time between last ' + issues.averageDurationLatestSize + ' Closings: ' + moment.duration(issues.averageDurationLatest,'days').humanize();    
    data += '</ul>';
    $('#' + projectName + '-Issues').html(data);    
        
}

function getProjectName(project) {
    return project.find( e => {
        return 'projectName'==e.eventType;
    }).ProjectName;
};

function findData(type, project) {
    return project.find( e => {
        return type == e.eventType;        
    });
};

// TODO make it to only render for one project
$(function(){
    AllProjects.forEach( project => {
        let projectName=getProjectName(project);
        let commits = findData('Commit', project);
        let tags = findData('Tag', project);
        let issues = findData('Issue', project);

        printTags(projectName, tags);
        printCommits(projectName, commits);
        printIssues(projectName, issues);

        drawChart(projectName, tags, commits, issues);
    });
});

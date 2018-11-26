window.chartColors = {
	red: 'rgb(255, 99, 132)',
	orange: 'rgb(255, 159, 64)',
	yellow: 'rgb(255, 205, 86)',
	green: 'rgb(75, 192, 75)',
	blue: 'rgb(54, 162, 235)',
	purple: 'rgb(153, 102, 255)',
	grey: 'rgb(201, 203, 207)'
};

barColours={
    Tags: window.chartColors.orange,
    Commits: window.chartColors.blue,
    Created_issues: window.chartColors.red,
    Closed_issues: window.chartColors.green,
    Forks: window.chartColors.purple
};

chartOptions={
    scale: {
        ticks: {
            display: false,
            min: -40,
            max: 100,
            stepSize: 20,
            showLabelBackdrop: false
        },
        gridLines: {
            display: false
        }
    },    
    legend: {
        display: false
    }        
};

function drawChart(componentName, chartData) {
    let context=document.getElementById(componentName+'-Graph').getContext('2d');
    let data = Object.values(chartData);
    
    let config = {
        type: 'polarArea',
        data: {
            datasets: [{
                data: Object.values(chartData),
                backgroundColor: Array.from(Object.keys(chartData), k => barColours[k])
            }],
            labels: Object.keys(chartData)
        },
        options: chartOptions
    };
        
    let myChart = new Chart(context, config);    
};

$(function(){
    console.log('Loading page for ' + componentName);
    drawChart(componentName, projectInfo.chartData);
});

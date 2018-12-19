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
    },
    tooltips: {
        callbacks: {
            label: function(tooltipItem, data) {
                let label = data.labels[tooltipItem.index] || '';
                return label;
            }
        }
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


function spin(element) {
    $(element).html('<i class="fas fa-spinner fa-spin fa-2x" style="vertical-align: text-top;"></i>');
}

function setIcon(element, icon='fa-hand-spock', size='') {
    $(element).html('<i class="far ' +  icon + ' ' + size + '" style="vertical-align: text-top;"></i>');    
}

// Return values are upside-down since if it is the first run I want any conditionals based on the return value to continue.
function toggleClicked(element, value) { 
    if (value) {
        $(element).data('isClicked', value);
        return true;
    }
    
    if ('true' == $(element).data('isClicked')) {
        return false;
    } else {
        $(element).data('isClicked', 'true');
        return true;
    }    
};

function sendFeedbackDecision(decision, textFeedback='') {
    let data = {
        assessment: projectInfo.assessmentSummary,
        feedback: decision,
        textFeedback: textFeedback,
        details: projectInfo.assessmentDetails
    };

    $.post('/submitFeedback', data, function(data, status) {
        console.log('Submitted feedback. Status code: ' + status);
    }).fail( function(err) {
        console.log('Failed while submitting feedback');
        console.log(err);
    });
}

function disconnect(elementsArray) {
    elementsArray.map(elem => {
        $(elem).off('click');
        $(elem).click(e => {return false;});        
    });
};

function connectElements() {
    let tag = '#' + safeName;
    let agree = $(tag).find('#agree');
    let disagree = $(tag).find('#disagree');
    let moreInfo = $(tag).find('.moreInfo');
    let feedbackArea =$(tag).find('#feedback');
    let moreInfoSubmit = $(moreInfo).find('#submitReason');
    let submissionStatus = $(tag).find('.submissionStatus');
    
    $(disagree).click( function (e) {
        if(toggleClicked(disagree)) {
            toggleClicked(agree, 'false'); // TODO: Also disable the other choice
            sendFeedbackDecision('disagree');
            $(moreInfo).css('display', 'inline-block');
            setIcon(agree, 'fa-thumbs-up');
            setIcon(disagree, 'fa-thumbs-down', 'fa-2x');
            disconnect([agree, disagree]);
        }
        return false;
    });

    $(agree).click( function (e) {
        if (toggleClicked(agree)) {
            toggleClicked(disagree, 'false'); // TODO: Also disable the other choice
            sendFeedbackDecision('agree');            
            $(moreInfo).css('display', 'none');
            setIcon(agree, 'fa-thumbs-up', 'fa-2x');
            setIcon(disagree, 'fa-thumbs-down');
            disconnect([agree, disagree]);
        }
        return false;
    });

    $(moreInfoSubmit).click( function (e) {
        let text=$(feedbackArea).val();
        sendFeedbackDecision('', text);                    
        $(submissionStatus).html('Thank you for your feedback.');
        $(submissionStatus).css('display', 'block');
        disconnect([moreInfoSubmit]);
    });
};

$(function(){
    console.log('Loading page for ' + componentName);
    console.log('Safe name is ' + safeName);

    connectElements();
    
    drawChart(safeName, projectInfo.chartData);    
});

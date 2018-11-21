
$(function(){
    console.log('Loading page for ' + componentName);
    console.log('Repository URL is ' + repoUrl);

    var params = {q:componentName,
                  url:repoUrl};    
    // $.get('/issues', params, function(data, status) {
    //     console.log(data);
    //     $('#IssueActivity').html(data);
    // });
});

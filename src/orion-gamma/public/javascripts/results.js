
function spin(element) {
    $(element).html('<i class="fas fa-spinner fa-spin fa-2x" style="vertical-align: text-top;"></i>');
}

function endSpin(element, icon='fa-eye') {
    $(element).html('<i class="fas ' + icon + ' fa-2x" style="vertical-align: text-top; color: #408040;"></i>');
}

$(function() {
    $('.resultItem').each(function() {
        let ri = $( this );
        let itemResults = ri.find('div.quickLookData');
        let spinner = ri.find('#spinner');
        let inputData = $(ri.find('#inputData')).attr('data-json');
        ri.data('quickLook', itemResults);
        ri.data('spinner', spinner);
        ri.data('inputData', inputData);
        ri.data('trawled', 'no');
    });

    $('.quickLook-search').click( function(e) {
        let item = $(e.target).parents('div.resultItem')[0];
        let itemResults = $(item).data('quickLook');
        let isTrawled = $(item).data('trawled');

        if ('no' == isTrawled) {
            let spinner = $(item).data('spinner');
            let inputData = JSON.parse($(item).data('inputData'));
            
            if (inputData.url) {
                // Ensure we won't search this again.
                $(item).data('trawled', 'yes');
                $(itemResults).addClass('Trawled');
                $(itemResults).removeClass('notTrawled');
                $(itemResults).html('Please wait while collecting data from other servers...');
                
                // Search
                spin(spinner);
                console.log('searching...');
                $.get(inputData.url, {}, function(data, status) {
                    console.log('got results');
                    $(itemResults).html(data);
                    endSpin(spinner);                
                }).fail( function(err){
                    console.log('received error from server');
                    $(itemResults).html('Could not find any details for this project <i class="far fa-sad-tear"></i>');
                    endSpin(spinner, 'fa-search');
                    
                    $(item).data('trawled', 'no');
                    $(itemResults).addClass('notTrawled');                    
                });
            } else {
                console.log('No URL found. Ignoring request');
            }
            
        } else {
            console.log('Has already trawled this project. Ignoring.');
        }
        e.preventDefault();
    });

    
    console.log('ready to serve');
});

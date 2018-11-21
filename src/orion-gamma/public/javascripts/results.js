
function spin(element) {
    $(element).html('<i class="fas fa-spinner fa-spin fa-2x" style="vertical-align: text-top;"></i>');
}

function endSpin(element) {
    $(element).html('<i class="fas fa-eye fa-2x" style="vertical-align: text-top; color: #408040;"></i>');
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

        console.dir(item);
        
        if ('no' == isTrawled) {
            let spinner = $(item).data('spinner');
            let inputData = JSON.parse($(item).data('inputData'));
            console.log(itemResults);
            
            if (inputData.url) {
                // Search
                spin(spinner);
                console.log('searching...');
                $.get(inputData.url, {}, function(data, status) {
                    console.log('got results');
                    $(itemResults).html(data);
                    endSpin(spinner);                
                });
            } else {
                console.log('No URL found. Ignoring request');
            }
            
            // Ensure we won't search this again.
            $(item).data('trawled', 'yes');
            $(itemResults).addClass('Trawled');
            $(itemResults).removeClass('notTrawled');
        } else {
            console.log('Has already trawled this project. Ignoring.');
        }
        e.preventDefault();
    });

    
    console.log('ready to serve');
});

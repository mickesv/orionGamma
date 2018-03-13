
$(function(){
    $('#search').on('focus', function(e) {
        $(this).val('');
    });
    
    $('#search').on('keyup', function(e) {
        if(e.keyCode === 13) {
            hand = handlers.split(',');
            var params = {search: $(this).val() };

            hand.forEach(function (h) {
                $('#Status' + h).html('<i class="fas fa-spinner fa-spin fa-3x"></i>');
                
                $.get('/search/' + h + '/', params, function(data, status) {
                    $('#Status' + h).html('');
                    $('#Results').html('Results searching for ' + params.search + ':');
                    $('#ResultsSection' + h).html(h);                    
                    $('#' + h).html(data);
                    $('#search').html('');

                    console.log('Return from ' + h + ' : ' + status);                    
                });
            });            
        } else {
            // This is apparently a new search
            // Empty all result fields
            hand = handlers.split(',');
            hand.forEach(function(h) {
                $('#Status' + h).html('');
                $('#Results').html('');
                $('#ResultsSection' + h).html('');                    
                $('#' + h).html('');
            });
        }
    });
});

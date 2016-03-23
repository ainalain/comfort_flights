/*
 *This is a separate module for searching matches in airports db.
 * Typeahead suggestion created here
 */

(function(module) {

    //show markers when map's updating through dragging or changing zoom
    module.idle_map_country = function() {
        var idle_promise = $.Deferred();
        $.when(module.getCountry(module.map, undefined, undefined)).done(function(results_array) {
            var country = results_array[2];
            idle_promise.resolve(country);
        });
    return idle_promise;
    };

    //update promise (info for map) when user clicks on the map
    module.if_click = function(click) {
        var click_promise = $.Deferred();
        module.removeMarkers();
        module.clearClusters();
        var suggestion = undefined;
        click_lat = click.latLng.lat();
        click_lng = click.latLng.lng();
        var clicked_coord = [click_lat, click_lng];
        $.when(module.getCountry(module.map, undefined, clicked_coord)).done(function(results_array) {
            var country = results_array[2];
            click_promise.resolve(country);
        });

        return click_promise;
    };

    // configure typeahead
    // https://github.com/twitter/typeahead.js/blob/master/doc/jquery_typeahead.md
    module.use_typeahed = function(suggestion) {
        var typeahed_promise = $.Deferred();
        // re-center map after place is selected from drop-down
        // ensure coordinates are numbers
        var latitude = (_.isNumber(suggestion.latitude)) ? suggestion.latitude : parseFloat(suggestion.latitude);
        var longitude = (_.isNumber(suggestion.longitude)) ? suggestion.longitude : parseFloat(suggestion.longitude);
        var typeahead_results = [];
        var suggestion_arr = [suggestion.name, suggestion.city, suggestion.country];
        // set map's center
        module.map.setCenter({lat: latitude, lng: longitude});
        $.when(module.getCountry(module.map, suggestion_arr, undefined)).done(function(results_array) {
            var wanted_country = results_array[2];
            var wanted_city = results_array[1];
            //save latitude and longitude for the module.wanted_city
            typeahed_promise.resolve([latitude, longitude, wanted_city, wanted_country]);
        });
        return typeahed_promise;
    };

    //ajax request to the airports database for typeahead's needs
    module.make_suggestion = function(query, cb) {

        // get places matching query (asynchronously)
        var query_string = query;
        $.getJSON($SCRIPT_ROOT + '/search', {
            query_string })
            .done(function (data, textStatus, jqXHR) {
                // call typeahead's callback with search results (i.e., places)
                //data results is array of objects (dictionaries)
                var arr = data.results;
                cb(arr);

            })
            .fail(function (jqXHR, textStatus, errorThrown) {

                // log error to browser's console
                console.log(errorThrown.toString());
            });
    };


    return module;

})(module || {});
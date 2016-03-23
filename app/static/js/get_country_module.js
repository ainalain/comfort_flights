/*
 *This is a separate module for get correct country in the center of view port when map's bounds are updating
 * Module uses Google Geocoding API: https://developers.google.com/maps/documentation/geocoding/intro
*/

(function(module) {



    //get country from google geocode API for updating airports within new bounds
    module.getCountry = function(map, suggestion, click) {
        var promise = $.Deferred();
        var bounds = map.getBounds();
        var center_lat = undefined;
        var center_long = undefined;
        //check if user had chosen any suggestion then show the marker of this very city
        if (suggestion != undefined) {
            var suggestion_name = suggestion[0];
            var suggestion_city = suggestion[1];
            var suggestion_country = suggestion[2];
            promise.resolve([suggestion_name, suggestion_city, suggestion_country]);
        }
        else {
            if (click != undefined) {
                center_lat = click[0];
                center_long = click[1];
            }
            else {
                //get center of bounded territory for skipping extra population of markers
                var bounds_center = bounds.getCenter();
                center_lat = bounds_center.lat();
                center_long = bounds_center.lng();
            }
            //make a deferred request to google geocoder for country in center of bounds

            var requestString = "https://maps.googleapis.com/maps/api/geocode/json?latlng=" +
                center_lat + ',' + center_long + "&result_type=country&key=" + APPLICATION_API_KEY + "&language=en";

            $.getJSON(requestString).success(function (arr_country) {
                if ((arr_country.status == "REQUEST_DENIED") && (arr_country.error_message.length > 1)) {
                    console.log("Results of AJAX request: ", arr_country.error_message);
                    console.log("There is a problem with using this API. Check your authentification api key and make sure that all google api are enabled. Then restart the application.");
                }
                //check if center is on the ocean area
                if (arr_country.status == "ZERO_RESULTS") {

                    //pass into python script center's coordinates for quering nearest country
                    promise.resolve([null, null, center_lat.toString() + ',' + center_long.toString() + ',ocean_yes']);

                }
                else {
                    promise.resolve([null, null, arr_country.results[0].formatted_address]);
                    //console.log("Country response: ", promise);
                }
            }).fail(function (jqXHR, textStatus, errorThrown) {

                // log error to browser's console
                console.log("Error in getting country");
                console.log(errorThrown.toString());
            });
        }

        return promise;
    };


})(module || {});

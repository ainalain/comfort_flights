/*
 *This is a separate module for saving user coordinates and airports that would be origin places in flight search
 */

(function(module) {

    module.get_user_info = function(user_marker) {
        var promise = $.Deferred();
        var user_lat = user_marker.position.lat();
        var user_lng = user_marker.position.lng();
        //make a symbolic rectangle around user location to find all airports (they'll be origins)
        var sw_lat = user_lat - 0.5;
        var ne_lat = user_lat + 0.5;
        var sw_lng = user_lng - 0.5;
        var ne_lng = user_lng + 0.5;
        //parameters is a query string for user_info app.route - to find all user airports
        var parameters = sw_lat + ',' + ne_lat + ',' + sw_lng + ',' + ne_lng;
        var user_info = [];
        $.getJSON($SCRIPT_ROOT + '/user_info', {
            parameters
        })
            .done(function (data, textStatus, jqXHR) {

                var user_airports_arr = data.results;
                var user_country = user_airports_arr[0].country;
                for (var k = 0; k < user_airports_arr.length; k++) {
                    if (user_airports_arr[k].iata_faa.length > 1) {
                        var iata = user_airports_arr[k].iata_faa;
                        var name = user_airports_arr[k].name;
                        user_info.push({user_iata: iata, user_name: name});
                    }
                }
                module.user_marker.country = user_country;
                promise.resolve(user_info);

            }).fail(function (jqXHR, textStatus, errorThrown) {

                    // log error to browser's console
                    console.log(errorThrown.toString());
                });

        return promise;
    };

    //this sinple function restores the special 'active' view of default user_marker
    module.restore_user_marker = function(markerActive) {
        if (markerActive) {
            module.user_marker.setIcon(STATIC_URL + "img/airport.png");
            module.user_marker.set('labelClass', 'labels');
            module.user_marker.setAnimation(google.maps.Animation.BOUNCE);
            setTimeout(function() {
                module.user_marker.setAnimation(null)
            }, 2000);

        }
            else {
                module.user_marker.setIcon(STATIC_URL + "img/airportinactive1.png");
                module.user_marker.set('labelClass', 'labelsInactive');
            }

    };

    return module;

})(module || {});
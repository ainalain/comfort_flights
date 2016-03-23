/*
 *This is a separate module for adding and deleting markers
  * Clusters are also instantiated and updated here
 */

(function(module) {

    //array of markers within view bounds
    var markers = [];

    //clusterer for markers
    var clusterer;
    module.save_clusterer = function(map) {
        var map = module.map;
        //var zoom = map.getZoom();
        var cluster_style = [{
            url: STATIC_URL + "img/airport.png",
            width: 55,
            height: 55,
            textColor: '#ffffff',
            textSize: 12
        }];


        //bind marker clusterer to the map
        clusterer = new MarkerClusterer(map, [], {styles: cluster_style[-1], gridSize: 30});

        return clusterer;
    };


    /*
    *Add markers to map
    */
    module.addMarker = function(place, coordinates) {

        var map = module.map;
        //array of counrties for clusterization of markers
        var countries = [];
        var lat, long, city, country, id;

        if (place == null) {
            lat = coordinates[0];
            long = coordinates[1];
            city = coordinates[2];
            country = coordinates[3];
            id = 0;
        }
        else {
            //get coordinates for every marker
            lat = parseFloat(place["latitude"]);
            long = parseFloat(place["longitude"]);
            city = place["city"];
            country = place["country"];
            id = place["id"];
        }
        //make the position of the marker
        var homeLatlng = new google.maps.LatLng(lat, long);
        var image = STATIC_URL + "img/airport3.png";

        var mymarker = new MarkerWithLabel({
            position: homeLatlng,
            draggable: false,
            map: map,
            icon: image,
            labelContent: city,
            labelAnchor: new google.maps.Point(26, 0),
            labelClass: "label",
            labelStyle: {opacity: 0.75},
            country: country,
            id: id
        });
        //make a list of countries for future clusterization
        countries.push(mymarker.country);
        $.when(module.check_country_size(mymarker.country)).done(function (results) {
                var zoom = undefined;

                if (results == true) {
                    zoom = 6;
                }
                else {
                    zoom = 8;
                }

                clusterer.maxZoom = zoom;
        });

        mymarker.setMap(map);
        //update array of current markers
        markers.push(mymarker);
        // console.log("Country: ", countries);
        clusterer.addMarker(mymarker);
        //if we have new origin marker from the modal's edit field then we have to change it's design
        if ((coordinates) && (place == null) && (!coordinates[4].typeaheadFlag)) {
            module.clicked_marker = mymarker;
            module.changeMarker(module.clicked_marker);
        }
        //else this marker is only possible destination but not the origin
        else {
            google.maps.event.addListener(mymarker, "click", function (click) {
                module.wanted_city = [];
                module.clicked_marker = mymarker;
                if (module.flight_parameters['choice'] == 'default') {
                    module.flight_parameters['date_to'] = module.get_date();
                }
                var content = undefined;
                //counter for successful searches: if there is any found flights, the "Sorry string" at the end of popup would be different.
                var searchok = 0;
                $.when(module.get_flights(mymarker, module.modalBeenOpened)).done(function (response) {
                    content = '<div class="iw-title">Found flights<button id="savehome" type="button" name="btn" class="btn btn-default btn-sm" data-toggle="tooltip" data-placement="right" title="Save clicked airports as origins"><span class="fa fa-home fa-lg"></span> Origin</button></div>' + '<div class="iw-content">';
                    var raw_content = response;

                    if (typeof(raw_content[0]) == 'string') {
                        //then we have a message about total failure or some errors
                        content += '<p id="noflight" class="flight-info"><span class="microtitle">' + raw_content + '</span></p>';
                    }
                    else {

                        //counter for failures of search
                        var failcount = 0;

                        for (m = 0; m < raw_content.length; m++) {
                            if (raw_content[m].failstring.length > 0) {
                                failcount += 1;
                            }
                            else {
                                searchok += 1;
                                //if we have flight or round flight without transfer
                                if ((raw_content[m].nonstop == true) || (raw_content[m].nonstopreturn == true)) {
                                    //this is a common data
                                    content += '<p class="flight-info"><span class="remark">' + searchok + '. Nonstop flight: </span></p><p class="flight-info"><span class="microtitle">Airports: </span>' + raw_content[m].airports +
                                    '</p><p class="flight-info"><span class="microtitle">Cities: </span>' +
                                    raw_content[m].cities + '</p>';
                                    //if this is 1 way trip
                                    if ((!raw_content[m].departure2.length) && (!raw_content[m].arrival2.length)) {

                                    content += '<p class="flight-info"><span class="microtitle">Carrier: </span>' + raw_content[m].carrier +
                                        '</p><p class="flight-info"><span class="microtitle">Departure: </span>' + raw_content[m].departure + '</p><p class="flight-info"><span class="microtitle">Arrival: </span>' +
                                        raw_content[m].arrival + '</p><p class="flight-info"><span class="microtitle">Price: </span>' + raw_content[m].pricing + '</p>';
                                    }
                                    //if this is a round trip, we have more data about date and time and maybe carrier, but the price and cities will be common
                                    else {
                                        content += '<p class="flight-info"><span class="microtitle">Carrier for the first flight: </span>' + raw_content[m].carrier +
                                                    '</p><p class="flight-info"><span class="microtitle">First departure: </span>' + raw_content[m].departure + '</p><p class="flight-info"><span class="microtitle">First arrival: </span>' +
                                                    raw_content[m].arrival + '</p><p class="flight-info"><span class="microtitle">Carrier for the return flight: </span>' + raw_content[m].carrier2 +
                                                    '</p><p class="flight-info"><span class="microtitle">Return flight\'s departure: </span>' + raw_content[m].departure2 + '</p><p class="flight-info"><span class="microtitle">Second arrival: </span>' +
                                                    raw_content[m].arrival2 + '</p><p class="flight-info"><span class="microtitle">Total price: </span>' + raw_content[m].pricing + '</p>';
                                    }
                                }
                                else {

                                    //the common data
                                    content += '<p class="flight-info"><span class="remark">' + searchok + '. Flight with transfer: </span></p><p class="flight-info"><span class="microtitle">Airports: </span>' + raw_content[m].airports + '</p><p class="flight-info"><span class="microtitle">Cities: </span>' +
                                    raw_content[m].cities + '</p>';
                                    //if this is 1 way trip
                                    if ((!raw_content[m].departure2.length) && (!raw_content[m].arrival2.length)) {
                                        content += '<p class="flight-info"><span class="microtitle">Carrier: </span>' + raw_content[m].carrier +
                                        '</p><p class="flight-info"><span class="microtitle">Departure: </span>' + raw_content[m].departure + '</p>';
                                        //if we know the transfer city
                                        if (raw_content[m].transferCity.length > 0) {
                                            content += '<p class="flight-info"><span class="microtitle">Transfer: </span>' +
                                            raw_content[m].transferTime + ' in ' + raw_content[m].transferCity + '</p><p class="flight-info"><span class="microtitle">Arrival: </span>' +
                                            raw_content[m].arrival + '</p>';
                                        }
                                        else {
                                            content += '<p class="flight-info"><span class="microtitle">Transfer: </span>' +
                                            raw_content[m].transferTime + '</p><p class="flight-info"><span class="microtitle">Arrival: </span>' +
                                            raw_content[m].arrival + '</p>';
                                        }
                                    content += '<p class="flight-info"><span class="microtitle">Price: </span>' + raw_content[m].pricing + '</p>';
                                    }
                                    //else we have a round trip with 1 or 2 tnrasfers!
                                    else {
                                        content += '<p class="flight-info"><span class="microtitle">Carrier for the first flight: </span>' + raw_content[m].carrier +
                                        '</p><p class="flight-info"><span class="microtitle">First departure: </span>' + raw_content[m].departure + '</p><p class="flight-info"><span class="microtitle">First arrival: </span>' +
                                        raw_content[m].arrival + '</p>';
                                        if (raw_content[m].transferCity.length > 0) {
                                            content += '<p class="flight-info"><span class="microtitle">First flight\'s transfer: </span>' +
                                            raw_content[m].transferTime + ' in ' + raw_content[m].transferCity + '</p>';
                                        }
                                        else {
                                            content += '<p class="flight-info"><span class="microtitle">First flight\s transfer: </span>' +
                                            raw_content[m].transferTime + '</p>';
                                        }
                                        //continue with the information about return
                                        content += '<p class="flight-info"><span class="microtitle">Carrier for the return flight: </span>' + raw_content[m].carrier2 +
                                        '</p><p class="flight-info"><span class="microtitle">Return flight\'s departure: </span>' + raw_content[m].departure2 + '</p><p class="flight-info"><span class="microtitle">Second arrival: </span>' +
                                        raw_content[m].arrival2 + '</p>';
                                        if (raw_content[m].transferCity2.length > 0) {
                                            content += '<p class="flight-info"><span class="microtitle">Transfer in returning flight: </span>' +
                                            raw_content[m].transferTime2 + ' in ' + raw_content[m].transferCity2 + '</p>';
                                        }
                                        else {
                                            content += '<p class="flight-info"><span class="microtitle">Transfer in returning flight: </span>' +
                                            raw_content[m].transferTime2 + '</p>';
                                        }
                                        content += '<p class="flight-info"><span class="microtitle">Total price: </span>' + raw_content[m].pricing + '</p>';
                                    }

                                }
                            }
                        }
                        if (failcount > 0) {
                            if (searchok == 0) {
                                content += '<br/><p id="noflight" class="flight-info"><span class="microtitle">No flights are found for these airport codes. Please, try another directions or change other flight parameters.</span></p>';
                            }
                            else {
                                content += '<br/><p id="noflight" class="flight-info"><span class="microtitle">No flights are found for other airports.</span></p>';
                            }

                        }
                    }
                    content += '</div>';

                    module.showInfo(mymarker, content);

                });


            });
        }

    };
    /*
     * small function for change the view of clicked marker if user wants it to be future origin
     */
    module.changeMarker = function(marker) {
        var homediv = '<div id="homediv">Now you are here</div>';
        marker.setIcon(STATIC_URL + "img/airport.png");
        marker.oldcity = marker.labelContent;
        marker.set('labelContent', homediv + marker.labelContent);
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function() {
            marker.setAnimation(null)
        }, 2000);

        return marker;
    };

    /*
     *Small function that "erases" old origin markers from the map (if the default user marker has been restored)
     */
    module.deleteClickedMarker = function(clicked, tempclicked) {
        if (clicked) {
            clicked.setMap(null);
        }
        if (tempclicked) {
            tempclicked.setMap(null);
        }
    };


    /**
     * Removes markers from map.
     */
    module.removeMarkers = function() {
        //check if there are already data in array of markers
        var len = markers.length;
        if (len > 0) {
            for (var i = 0; i < len; i++) {
                markers[i].setMap(null);
            }
            markers = [];

        }

    };

    /**
     * Shows info window at marker with content.
     */
    module.showInfo = function(marker, content) {
       // google.maps.InfoWindow.prototype.opened = false;

        var info = new google.maps.InfoWindow({ maxWidth: 500 });
        // start div
        var div = "<div id='info'>";
        if (typeof(content) == "undefined") {
            // http://www.ajaxload.info/
            var imgUrl = STATIC_URL + "img/ajax-loader.gif";
            div += '<img alt="loading" src="' + imgUrl + '">';
        }
        else {
            div += content;
        }

        // end div
        div += "</div>";



        /* Thanks to Miguel Marnoto and hi ideas about customization og Google Infowindow,
         * solution got from: http://en.marnoto.com/2014/09/5-formas-de-personalizar-infowindow.html
        */
        google.maps.event.addListener(info, 'domready', function() {

            // Reference to the DIV which receives the contents of the infowindow using jQuery
            var iwOuter = $('.gm-style-iw');
            // The DIV we want to change is above the .gm-style-iw DIV.
            var iwBackground = iwOuter.prev();
            // Remove the background shadow DIV
            iwBackground.children(':nth-child(2)').css({'display': 'none'});
            // Remove the white background DIV
            iwBackground.children(':nth-child(4)').css({'display': 'none'});
            // Changes the desired color for the tail outline.
            iwBackground.children(':nth-child(3)').find('div').children().
                css({'box-shadow': 'rgba(72, 181, 233, 0.6) 0px 1px 6px', 'z-index': '5'});
            iwBackground.children(':nth-child(3)').find('div').css({'top': '-2px'});
            //Implement the style (position and color) of close button
            var iwCloseBtn = iwOuter.next();
            // Apply the desired effect to the close button
            iwCloseBtn.css({
                width: '17px',
                height: '17px',
                opacity: '2', // by default the close button has an opacity of 0.7
                right: '55px', top: '20px', // button repositioning
                border: '2px solid #48b5e9', // increasing button border and new color
                'border-radius': '8px' // circular effect

            });
            iwCloseBtn.mouseout(function () {
                $(this).css({opacity: '2'});
            });
        });
        // set info window's content
        info.setContent(div);

        // open info window (if not already open)
        info.open(module.map, marker);
        google.maps.event.addListener(info,'closeclick',function() {
            //info.close();
            module.infocheck = false;
        });

        //close infowindow only if user clicks the close button
        module.infocheck = module.isInfoWindowOpen(info);

    };

    /*
     * Small function for checking if infowindow has been already opened:
     * then dragging the map or zoom changing won't close it automatically
     */
    module.isInfoWindowOpen = function(infoWindow){
        var map = infoWindow.getMap();
        return (map !== null && typeof map !== "undefined");
    };



    /*
     *Clears the clusterer while updating map
     */
    module.clearClusters = function() {
        if (clusterer) {
            clusterer.clearMarkers();
        }
    };

    //small countries and large countries have different cluster dependencies
    module.check_country_size = function(country) {
        var size_promise = $.Deferred();
        var parameters = country;
        $.getJSON($SCRIPT_ROOT + '/large_country', {parameters})
            .done(function (data, textStatus, jqXHR) {
                var if_large = undefined;
                if (data.results.length == 0) {
                    if_large = false;

                    size_promise.resolve(if_large);
                }
                else {
                    if_large = true;
                    size_promise.resolve(if_large);
                }

            })
            .fail(function (jqXHR, textStatus, errorThrown) {

                // log error to browser's console
                console.log(errorThrown.toString());
            });
        return size_promise;
    };

    return module;
})(module || {});

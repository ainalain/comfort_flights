/**
 * scripts.js
 *
 * Computer Science 50
 *
 * by student Elena Sufieva
 *An application for airports and flights on the world map
 *Final project
 *
 * Global JavaScript.
 */

var module = (function() {

    'use strict';

    //all global variables would been saved as properies of module
    //there is google map as map
    var module = {
        map: null,  //the google map we use
        country: '',
        wanted_country: '',
        wanted_city: [], //this variable holds the marker that appeared after use of typeahed (if user drags the map for better view but doesn't want to loose this city)
        wantedCityCounter: 0, //counter for the updating of the typeahead wanted city: after 2 updates of the map this marker will set to null
        infocheck: false, //flag that shows if infowindow is opened/closed at the moment
        savedorigins: [],
        clicked_marker: undefined, //this is a variable which will save our marker if user wants to keep it as origin
        codeForModal: [],  //holds (in get_flight module) iata code of airport which user may want to save as origin
        modalBeenOpened: 1 //this variable is for special rare check if user had changed origin from saved back to default and had not opened the modal to submit it
    };

    //variable for all flight parameters
    //if user doesn't choose them through modal, there are default values
    module.flight_parameters = {
        choice: 'default',
        codes_are_saved: false,
        passengers: {'adultCount': 1, 'childCount': 0},
        date_to: '',
        date_return: '',
        price: 'USD500',
        origin_names: [],
        edit_origin: undefined,
        coordinates: [], //coordinates of the city for the origin marker on the map
        realButtons : null, //this awful mess of variables is the only way that I see: I need it to hold the button lables after map's updating
        realCodes: null //this will be an array for saved codes (not possible origins but real saved origin codes)
    };

    //marker of user's location
     module.user_marker = new MarkerWithLabel({
        position: undefined,
        draggable: false,
        map: module.map,
        icon: undefined,
        labelContent: "You are here",
        labelAnchor: new google.maps.Point(16, 8),
        labelClass: "labels"
    });

    //get the user's location fo centering the map
    module.geolocate = function() {
        var promise = $.Deferred();
        var centreCoord = [];
        if (typeof (navigator.geolocation) != 'undefined') {

            navigator.geolocation.getCurrentPosition(function (position) {
                //if geolocation works correctly
                promise.resolve([position.coords.latitude, position.coords.longitude]);
            });
            //give to browser 2 seconds for geolocation, after that resolve promise into default coordinates
            setTimeout(function() {
                promise.resolve([42.3770, -71.1256]);
            }, 2000);

        }
        else {
            promise.resolve([42.3770, -71.1256]);
        }
        return promise;
    };

    module.initialize = function(centralmap, styles) {

        var options = {
            center: {lat: centralmap[0], lng: centralmap[1]}, // user's location or Cambridge, Massachusetts
            disableDefaultUI: true,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            minZoom: 3,
            maxZoom: 14,
            panControl: true,
            styles: styles,
            zoom: 4,
            zoomControl: true
        };

        // get DOM node in which map will be instantiated
        var canvas = $("#map-canvas").get(0);

        // instantiate map
        module.map = new google.maps.Map(canvas, options);

        //establish options for marker clusterer
        module.save_clusterer(module.map);
        //save coordinates of user's location
        var user_latlng = new google.maps.LatLng(centralmap[0], centralmap[1]);
        module.user_marker.position = user_latlng;
        module.user_marker.country = '';
        module.user_marker.icon = STATIC_URL + "img/airport.png";
        //save airports of user position for buttons in modal
        module.user_marker.origins = [];
        //choose some airports corresponding to user location (as origins)
        $.when(module.get_user_info(module.user_marker)).done(function(user_info) {
            for (var h = 0; h < user_info.length; h++) {
                var name = user_info[h].user_name;
                var iata = user_info[h].user_iata;
                module.user_marker.origins.push({origin_name: name, origin_iata: iata});

            }
            module.flight_parameters.origin_names.push(module.user_marker.origins[0].origin_iata);
            if (module.user_marker.origins.length > 2) {
                module.flight_parameters.origin_names.push(module.user_marker.origins[2].origin_iata); //this are my regular origins in Moscow: SVO and DME
            }

        });
        var date = module.get_date();
        module.flight_parameters.date_to = date;
        // configure UI once Google Map is idle (i.e., loaded)
        google.maps.event.addListenerOnce(module.map, "idle", module.configure);

    };

   // execute when the DOM is fully loaded
    $(function () {
        var centralmap = [];
        var styles = [];

        $.when(module.geolocate()).done(function (centralmap) {

            // styles for map
            // https://developers.google.com/maps/documentation/javascript/styling
            styles = [

                //show only country names by default
                {
                    featureType: "administrative.country",
                    elementType: "labels",
                    stylers: [
                        {visibility: "on"},
                        {saturation: 40}
                    ]
                },
                // hide Google's labels
                {
                    featureType: "administrative.locality",
                    elementType: "labels",
                    stylers: [
                        {visibility: "off"}
                    ]
                },

                // hide roads
                {
                    featureType: "road",
                    elementType: "geometry",
                    stylers: [
                        {visibility: "on"}
                    ],
                    elementType: "labels",
                    stylers: [
                        {visibility: "off"}
                    ]

                }

            ];

            module.initialize(centralmap, styles);

        }).
            fail(function (jqXHR, textStatus, errorThrown) {
                console.log(errorThrown.toString());

            });

    });

    /*
     *configures tha map and listens to different events
     */
    module.configure = function() {

        $("#warning-alert").hide();

        //temporary variable for holding first clicked marker, need for changing (first clicked marker - second clicked marker etc.)
        var tempclicked = undefined;
        //this array of airport origins will be shown on buttons within modal
        var originButtons = [];
        if (module.codeForModal.length) {
            originButtons = module.codeForModal;
        }
        //this array of codes will hold the saved on map airports (not to confuse with 'probable' savedorigins)
        var codesFromMap = [];
        if (module.savedorigins.length) {
            codesFromMap = module.savedorigins;
        }

        //flag for buttons which show/hide all airports
        var show_button = false;

        //set user's location
        module.user_marker.setMap(module.map);
        //choose the view of default user marker ("active" or "pale")
        if (module.flight_parameters.codes_are_saved == false) {
            module.user_marker.setVisible(true);
        }
        else {
            //change the style of default user marker
            module.restore_user_marker(false);
        }
        module.user_marker.addListener('click', function() {
            module.flight_parameters.codes_are_saved = false;
            module.modalBeenOpened = 1;
            module.deleteClickedMarker(module.clicked_marker, tempclicked);
            module.restore_user_marker(true);
        });

        // give focus to text box
        $("#q").focus();

        //get airports for the first load of the page (analogue of 'first' update)
        var parameters = module.user_marker.country;
        $.getJSON($SCRIPT_ROOT + '/first_load', {
            parameters })
            .done(function (data, textStatus, jqXHR) {
                var places = data.results;
                var cities = [];

                //search for capital of this country to show only it
                $.when(module.get_capital(places[0].country)).done(function (capital) {
                    //add only 1 marker for this country
                    for (var r = 0; r < places.length; r++) {
                        cities.push(places[r].city);
                    }
                    var cap_index = $.inArray(capital, cities);
                    if (cap_index < 0) {
                        module.addMarker(places[0]);
                    }
                    else {
                        module.addMarker(places[cap_index]);
                    }
                });
            }).
            fail(function (jqXHR, textStatus, errorThrown) {
                // log error to browser's console
                console.log(errorThrown.toString());
            });

        var $showButton = $("button#show");
        var $hideButton = $("button#hide");
        //show all airports of country if button pressed
        $showButton.on("click", function () {
            $showButton.toggleClass("active disabled");
            $hideButton.toggleClass("disabled active");
            show_button = true;
            if (module.wanted_country.length > 1) {
                module.update(module.wanted_country, show_button, null);
            }
            else {
                $.when(module.idle_map_country()).done(function (country) {
                    module.update(country, show_button, null);
                });
            }
        });
        //hide all airports except capital if hide button is pressed
        $hideButton.on("click", function () {
            $hideButton.toggleClass("active disabled");
            $showButton.toggleClass("disabled active");
            show_button = false;
            if (module.wanted_country.length > 1) {
                module.update(module.wanted_country, show_button, null);
            }
            else {
                $.when(module.idle_map_country()).done(function (country) {
                    module.update(country, show_button, null);
                });
            }
        });

        //tooltip proposes saving this  (clicked) marker as origin
        $("#savehome").tooltip();
        //save clicked marker as new origin if user wants it (with a special button within infowindow)
        $(document).on("click", "#savehome", function() {
            module.flight_parameters.edit_origin = false;
            module.modalBeenOpened = -1;
            module.flight_parameters.codes_are_saved = true;
            module.flight_parameters.realCodes = module.savedorigins;
            module.flight_parameters.realButtons = module.codeForModal;       //save these names for buttons in modal
            codesFromMap = module.flight_parameters.realCodes;
            originButtons = module.flight_parameters.realButtons;       //save these names for buttons in modal
            module.changeMarker(module.clicked_marker);
            //change the style of default user marker
            module.restore_user_marker(false);

            //if we had already temporary marker, annulate it
            if (tempclicked) {
                tempclicked.setMap(null);
            }
            //update temporary marker
            if (module.clicked_marker) {
                tempclicked = module.clicked_marker;
            }
        });

        //let user choose flight parameters fields if button clicked
        $("#flight_param").on('click', function() {
            module.modalBeenOpened = 2;
            //save all changes in flight parameters through separate module
            $.when(module.change_parameters(originButtons, codesFromMap)).done(function(parameters) {
               module.flight_parameters = parameters;

            });

        });

        //change the view of user marker if user submits in modal default airports
        $('#param').on('hidden.bs.modal', function() {
            //if the coordinates array is a strung about gibberish in the origin field, we want to show an alert with message to user
            if ((module.flight_parameters.coordinates !== undefined) && (typeof(module.flight_parameters.coordinates[0]) == 'string') && (module.flight_parameters.coordinates.length == 1)) {
                $("#warning-alert").alert();
                $("#warning-alert").fadeTo(4000, 500).slideUp(500, function(){
                    $("#warning-alert").hide();
                });
            }
            if (!module.flight_parameters.codes_are_saved) {
                if (module.flight_parameters.edit_origin) {
                    //clear all previous saved parameters as markers, cities and codes
                    originButtons = [];
                    codesFromMap = [];
                    module.deleteClickedMarker(module.clicked_marker, tempclicked);
                    //the python script return us an array of tuples, every of them has latitude/longitude paia, so we need only the first tuple
                    module.flight_parameters.coordinates = module.flight_parameters.coordinates[0];
                    module.addMarker(null, module.flight_parameters.coordinates);
                    module.map.setCenter({lat: module.flight_parameters.coordinates[0], lng: module.flight_parameters.coordinates[1]}); //make this new origin the center of the  map
                    //update temporary marker
                    if (module.clicked_marker) {
                        tempclicked = module.clicked_marker;
                    }
                    var forModal = module.flight_parameters.coordinates[4] + ' ' + module.flight_parameters.coordinates[2]; //iata code + name of the city
                    originButtons.push(forModal);
                    codesFromMap.push(module.flight_parameters.coordinates[4]);
                    module.flight_parameters.codes_are_saved = true;
                    module.restore_user_marker(false);
                }
               else {
                    //return to the default user's origin
                    module.flight_parameters.codes_are_saved = false;
                    module.map.setCenter(module.user_marker.position);
                    module.restore_user_marker(true);
                    module.deleteClickedMarker(module.clicked_marker, tempclicked);
               }
           }
            module.modalBeenOpened = 2;
        });

        // update UI after map has been dragged
        google.maps.event.addListener(module.map, "dragend", function () {
            //update map only if infowindow is closed, or we'll loose the flight's data
            if (module.infocheck === false) {
                $.when(module.idle_map_country()).done(function (country) {
                    module.wanted_country = country;
                    module.update(country, show_button, null);
                });
                //if we have origin from "savehome" button, keep it safe
                if (module.flight_parameters.codes_are_saved == true) {
                    module.restore_user_marker(false);
                    originButtons.forEach(function(originButton) {
                        if (originButton.substr(4) == module.clicked_marker.oldcity) {
                            module.clicked_marker.setMap(module.map);
                        }
                        else {
                            module.clicked_marker.setMap(null);
                        }
                    });
                }
                //else if we have another origin marker because user chose it through "edit origin" field in the modal, keep it safe
                else if (module.flight_parameters.edit_origin) {
                    module.restore_user_marker(false);
                    module.clicked_marker.setMap(module.map);
                }
                else {
                    module.restore_user_marker(true);
                    if (module.clicked_marker) {
                        module.clicked_marker.setMap(null);
                    }
                }

            }

        });

        // update UI after zoom level changes, if there is no infowindow opened
        google.maps.event.addListener(module.map, "zoom_changed", function () {
            //update map only if infowindow is closed, or we'll loose the flight's data
            if (module.infocheck === false) {
                $.when(module.idle_map_country()).done(function(country) {
                    module.wanted_country = country;
                    module.update(module.wanted_country, show_button, null);
                    //if we have origin from "savehome" button, keep it safe
                    if (module.flight_parameters.codes_are_saved == true){
                        module.restore_user_marker(false);
                        originButtons.forEach(function(originButton) {
                            if (originButton.substr(4) == module.clicked_marker.oldcity) {
                                module.clicked_marker.setMap(module.map);
                            }
                            else {
                                module.clicked_marker.setMap(null);
                            }
                        });
                    }
                    //else if we have another origin marker because user chose it through "edit origin" field in the modal, keep it safe
                    else if (module.flight_parameters.edit_origin) {
                        module.restore_user_marker(false);
                        module.clicked_marker.setMap(module.map);
                    }
                    else {
                        module.restore_user_marker(true);
                        if (module.clicked_marker) {
                            module.clicked_marker.setMap(null);
                        }
                    }
                });

            }

        });

        // remove markers whilst dragging, if there is no suspended infowindow
        google.maps.event.addListener(module.map, "dragstart", function () {
            if (module.infocheck === false) {
                module.removeMarkers();
                module.clearClusters();
            }
        });

        //update map when user clicks on the map
        google.maps.event.addListener(module.map, "click", function (click) {
           //put the flag that infowindow is now closed
            module.infocheck = false;
            $.when(module.if_click(click)).done(function (country) {
               module.wanted_country = country;
               module.update(module.wanted_country, show_button, null);
               if (module.flight_parameters.codes_are_saved == true) {
                   module.restore_user_marker(false);
                   originButtons.forEach(function (originButton) {
                       if (originButton.substr(4) == module.clicked_marker.oldcity) {
                           module.clicked_marker.setMap(module.map);
                       }
                       else {
                           module.clicked_marker.setMap(null);
                       }
                   });
               }
               //else if we have another origin marker because user chose it through "edit origin" field in the modal, keep it safe
               else if (module.flight_parameters.edit_origin) {
                       module.restore_user_marker(false);
                       module.clicked_marker.setMap(module.map);
                   }
               //else we have our old good default origin marker
               else {
                   module.restore_user_marker(true);
                   if (module.clicked_marker) {
                       module.clicked_marker.setMap(null);
                   }
               }

           });

        });

        //use twitter typeahed feature for searching places
        $("#q").typeahead({
                autoselect: true,
                highlight: true,
                minLength: 3
            },
            {
                source: module.make_suggestion,
                templates: {
                    empty: "no places found yet",
                    suggestion: _.template("<p><%- name %>, <%- city %>, <%- country %></p>")
                }
            }).bind("typeahead:selected", function(ev, suggestion) {
                $.when(module.use_typeahed(suggestion)).done(function(typehead_results) {
                    var wanted_city = typehead_results[2];
                    module.wanted_country = typehead_results[3];
                    //make a flag that user chose something with typehead and there is no need add a capital twice
                    var typeahedUsed = true;
                    module.update(module.wanted_country, show_button, wanted_city, typeahedUsed);
                    if ((module.flight_parameters.codes_are_saved == true) || (module.flight_parameters.edit_origin)){
                        module.restore_user_marker(false);
                        originButtons.forEach(function(originButton) {
                            if (originButton.substr(4) == module.clicked_marker.oldcity) {
                                module.clicked_marker.setMap(module.map);
                            }
                            else {
                                module.clicked_marker.setMap(null);
                            }
                        });
                    }
                    else {
                        module.restore_user_marker(true);
                        if (module.clicked_marker) {
                            module.clicked_marker.setMap(null);
                        }
                    }
                    //save this wanted_city array for the future updates of the map
                    module.wanted_city = typehead_results;
                    module.wanted_city.push({typeaheadFlag: true});
                });
            });

        // re-enable ctrl- and right-clicking (and thus Inspect Element) on Google Map
        // https://chrome.google.com/webstore/detail/allow-right-click/hompjdfbfmmmgflfjdlnkohcplmboaeo?hl=en
        document.addEventListener("contextmenu", function (event) {
            event.returnValue = true;
            event.stopPropagation && event.stopPropagation();
            event.cancelBubble && event.cancelBubble();
        }, true);

    };

   module.update = function(country, show_button, wanted_city, typeheaduse) {
        // get map's bounds
        var bounds = module.map.getBounds();
        var ne = bounds.getNorthEast();
        var sw = bounds.getSouthWest();
        // get cities within bounds (asynchronously)
        var parameters = ne.lat() + "," + ne.lng() + "," + sw.lat() + "," + sw.lng() + "," + country;
        $.getJSON($SCRIPT_ROOT + '/update', {
            parameters }).done(function (data, textStatus, jqXHR) {

                // remove old markers from map
                module.removeMarkers();
                //clear clusterer
                module.clearClusters();

                var places = data.results;
                var cities = [];
                if (show_button) {
                    for (var i = 0; i < places.length; i++) {
                        if ($.inArray(places[i].city, cities) < 0) {
                            cities.push(places[i].city);
                            module.addMarker(places[i]);
                        }
                        else {
                            continue;
                        }
                    }
                }
                else {
                    for (var i = 0; i < places.length; i++) {
                        //console.log("Searching city in places: ", places[i].city);
                        if (wanted_city != places[i].city) {
                            continue;
                        }
                        else {
                            module.addMarker(places[i]);
                            break;
                        }
                    }
                    if (!typeheaduse) {
                        //search for capital of this country to show only it
                        $.when(module.get_capital(places[0].country)).done(function (capital) {
                            //add only 1 marker for this country
                            for (var r = 0; r < places.length; r++) {
                                cities.push(places[r].city);
                            }
                            var cap_index = $.inArray(capital, cities);
                            if (cap_index < 0) {
                                module.addMarker(places[0]);

                            }
                            else {
                                module.addMarker(places[cap_index]);
                            }
                            //if we have a marker thanks to the typeahead usage (it means that user searched for thi city),
                            // we'll hold this marker until 3 changes of the map
                            if (module.wanted_city.length > 0) {
                                if (module.wanted_city[2] !== capital) {
                                    if (module.wantedCityCounter < 3) {
                                        module.addMarker(null, module.wanted_city);
                                        module.wantedCityCounter++;
                                    }
                                    else {
                                        module.wanted_city = [];
                                        module.wantedCityCounter = 0;
                                    }
                                }
                            }
                        });

                    }
                }
                module.user_marker.setMap(module.map);

            })
            .fail(function (jqXHR, textStatus, errorThrown) {

                // log error to browser's console
                console.log(errorThrown.toString());
            });
   };

    return module;
})();

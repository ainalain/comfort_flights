/**
 *Make request to qpx express API for flights information
 */

(function(module) {


    module.get_flights = function(marker, modalCheck) {

        var request_promise = $.Deferred();

        //if we have default origins but modal for this request had not been opened
        if (modalCheck == 1) {
            module.flight_parameters.choice = "default";
            //zero the flight parameters origins' array
            module.flight_parameters.origin_names = [];
            module.flight_parameters.origin_names[0] =  module.user_marker.origins[0].origin_iata;
            if (module.user_marker.origins.length > 2) {
                module.flight_parameters.origin_names.push(module.user_marker.origins[2].origin_iata); //this are my regular origins in Moscow: SVO and DME
            }
        }
        //else if user dap saved his own origins on the map and yet had not opened the modal
        else if (modalCheck == -1) {
            if (module.flight_parameters.realCodes.length > 0)
            module.flight_parameters.origin_names = module.flight_parameters.realCodes;

        }
        var origins_saved = module.flight_parameters.codes_are_saved;
        var passengers = module.flight_parameters.passengers;
        var departure1 = module.flight_parameters.date_to;
        var departure2 = module.flight_parameters.date_return;
        var maxprice = module.flight_parameters.price;
        var submitted_origins = module.flight_parameters.origin_names;
        //make a list of origin airports by their iata code
        var origin_arr_iata = [];
        //make an array of origin iata codes if user had chosen some parameters through the modal window
        if (module.flight_parameters.choice === 'submitted') {
            if (module.flight_parameters.edit_origin == true) {
                origin_arr_iata.push(submitted_origins[0]);
            }
            else {
                if (origins_saved == true) {
                    var origin_full_iata = submitted_origins;
                    origin_arr_iata = origin_full_iata.map(function(item) {
                        return item.substr(0, 3);
                    });

                }
                else {
                    //compare all user airports list and list of submitted airports. Choose only submitted airports
                    for (var z = 0; z < module.user_marker.origins.length; z++) {
                        for (var q = 0; q < submitted_origins.length; q++) {
                            if (module.user_marker.origins[z].origin_name == submitted_origins[q]) {
                                origin_arr_iata.push(module.user_marker.origins[z].origin_iata);
                            }
                        }
                    }
                }

            }
        }
        else {
            if (origins_saved == true) {
                var origin_full_iata = submitted_origins;
                origin_arr_iata = origin_full_iata.map(function(item) {
                    return item.substr(0, 3);
                });

            }
            else {
                //if user is lazy and didn't choose any airports through the modal or with clicked marker - we have default values
                origin_arr_iata = module.flight_parameters.origin_names;
            }

        }

        var qpx_request = {};

        //get asynchronously airports' code from airtpos database
        var city = marker.labelContent;
        var country = marker.country;
        var latitude = marker.position.lat();
        //save iata code for airports of destination city

        var  slice = [];
        //request parameters for qpx express api
        qpx_request =
        {
            "request": {
                "passengers": passengers,
                "slice": undefined,
                "maxPrice": maxprice,
                "solutions": 1
            }
        };

        var parameters = city + ',' + country + ',' + latitude;
        var code_promise = $.Deferred();
        $.when(module.get_airport_code(parameters)).done(function(results) {

            var whole_destination = [];
            for (var l = 0; l < results.length; l++) {
                whole_destination.push(results[l][0]);
            }
           // console.log("Whole destination iata array: ", whole_destination);
            whole_destination = whole_destination.filter(function(dest) {
                if (dest.length > 1) {
                    return dest;
                }
             });
            //if this is a city that we found in the database but there are some silly errors (in order of names and codes)
            //we fix it manually
           if ((city == 'Tallinn') && (country == 'Estonia')) {
                whole_destination.push('TLL');
            }
            else if ((city == 'New Delhi') && (country == 'India')) {
                whole_destination.push('DEL');
            }
            if (!whole_destination.length) {
                var badDestination = "Sorry, but this city has no corresponding airport codes in our database. Please, choose another destination.";
                request_promise.resolve(badDestination);

            }
            else {
                var savedOrigins = whole_destination.slice(0, 2);
                module.savedorigins = savedOrigins;

                module.codeForModal = savedOrigins.map(function (savedCode) {
                    savedCode += ' ' + city;
                    return savedCode;
                });

                qpx_request = module.initConf(qpx_request, departure1, departure2);
                 module.process_data(origin_arr_iata, whole_destination.slice(0, 2), qpx_request).done(function(responses) {

                 var formattedResponses = [];

                 //make an idiotic check that this responses are not a single response! Because we need to know it to iterate correctly
                 if ((responses.length == 3) && (responses[1] == 'success')) {
                     var oneResponse = module.ajax_response(responses);
                     formattedResponses.push(oneResponse);
                 }
                 else {
                     for (var key in responses) {
                     if (responses.hasOwnProperty(key)) {
                     var oneResponse = module.ajax_response(responses[key]);
                     formattedResponses.push(oneResponse);
                        }
                    }
                 }
                 request_promise.resolve(formattedResponses);
                 }).fail(function(status, errorText) {
                     //if this is an error 403 "Forbidden"
                     if (status === 403) {
                         request_promise.resolve([
                             "Unfortunately, free day limit has been exceeded. Please, try tomorrow."
                         ]);
                     }
                     //if there was a bad request
                     else if (status === 400) {
                        request_promise.resolve(["The request was malformed: the airports codes are not found. Please, change your flight parameters and try again."]) ;
                     }
                 });
            }
        });

        return request_promise;
   };


    //small function for make a correct slice of request
    module.initConf = function(confObject, departureDate, returnDate) {
        var slice = [];
        if (returnDate.length < 1) {
            slice = [
                {
                    "origin": '',
                    "destination": '',
                    "date": departureDate,
                    "maxStops": 1,
                    "maxConnectionDuration": 600
                }
            ];
        }
        else {
            slice = [
                {
                    "origin": '',
                    "destination": '',
                    "date": departureDate,
                    "maxStops": 1,
                    "maxConnectionDuration": 600
                },
                {
                    "origin": '',
                    "destination": '',
                    "date": returnDate,
                    "maxStops": 1,
                    "maxConnectionDuration": 600
                }
            ];
        }

        confObject.request.slice = slice;
        return confObject;
    };

    module.setOrigin = function(confObject, origin) {
        confObject.request.slice[0].origin = origin;

    };

    module.setDestination = function(confObject, destination, origin) {
        confObject.request.slice[0].destination = destination;
        if (confObject.request.slice.length > 1) {
            confObject.request.slice[1].origin = destination;
            confObject.request.slice[1].destination = origin;
        }
    };

    module.process_data = function(origin_data, destination_data, confObject) {
        var promises = [];
        origin_data.forEach(function(origin) {
            module.setOrigin(confObject, origin);
            var destination = '';
            promises = promises.concat(destination_data.map(function(destination) {
                module.setDestination(confObject, destination, origin);
                var request = JSON.stringify(confObject);
                //make ajax request for google api
                return $.ajax({
                    url: QPX_URL,
                    data: request,
                    method: "POST",
                    contentType: 'application/json'
                });
            }));
        });
        var singlePromise = $.Deferred();
        var failarguments = [];
        $.when.apply(this, promises).done(function() {

            singlePromise.resolve(arguments);
        }).fail(function(jqXHR, textStatus, errorThrown) {
            //console.log(errorThrown);
            //console.log(jqXHR);
            if (jqXHR.status === 403) {
                singlePromise.reject(403, errorThrown);
            }
            else if (jqXHR.status === 400) {
                singlePromise.reject(400, errorThrown);
            }
        });

        return singlePromise;
    };

    //this is a function for dealing with ajax response (formatting flight data)
    module.ajax_response = function(response_arr) {

        var flight_data = {
            airports: [],
            airports2: [], //airports for the return flight (if there is a transfer, the airportd and cities may be different)
            cities: [],
            cities2: [],
            carrier: [],
            carrier2: [],
            pricing: '',
            departure: '',
            arrival: '',
            departure2: '',
            arrival2: '',
            nonstop: undefined,
            nonstopreturn: undefined,
            transferTime: '',
            transferTime2: '',
            transferCity: '',
            transferCity2: ''
        };
        var response = response_arr[0];
        var flightSegments = [];
        if ((!response.trips.data.hasOwnProperty('airport')) || (response.trips == undefined)){
            var sadstring = "Sorry, there is no such flight";
            //response_array.push(sadstring);
            flight_data.failstring = sadstring;
        }

        var airports_arr = response.trips.data.airport;
        var response_cities = response.trips.data.city;
        //var airports_arr2 = response.trips.data.airport;
        //if there is no flights between origin and destination airports
        if ((airports_arr == undefined) || (flight_data.cities == undefined)) {
            var sadstring2 = "Sorry, there is no such flight";
            flight_data.failstring = sadstring2;
        }
        else {
            flight_data.failstring = '';
            for (var n = 0; n < airports_arr.length; n++) {
                flight_data.airports.push(airports_arr[n].name);
                flight_data.cities.push(response_cities[n].name);
            }

            //pretty formatting the cities and airports' data
            flight_data.airports = flight_data.airports.join(', ');
            flight_data.cities = flight_data.cities.join(', ');

            //check if request has round way and response holds 2 segment of journey
            if ((response.trips.tripOption == undefined) || (response.trips.tripOption.length < 1)) {
                var sadstring = "Sorry, there is no such flight";
                //response_array.push(sadstring);
                flight_data.failstring = sadstring;
            }
            else {
                flightSegments = response.trips.tripOption[0].slice;
                module.prettyDate(flight_data, flightSegments);
                //case when user wants only 1 way trip
                if (flightSegments.length < 2) {
                    var wholesegment = response.trips.tripOption[0].slice[0].segment;
                    if (wholesegment.length < 2) {

                        flight_data.carrier[0] = response.trips.data.carrier[0].name;
                        flight_data.pricing = response.trips.tripOption[0].saleTotal;
                    }
                    else {
                        var transfercode = response.trips.tripOption[0].slice[0].segment[0].leg[0].destination;
                        for (var j = 0; j < airports_arr.length; j++) {
                            //compare transfercode and codes in the airports array - difficult way to get the name of transfer city
                            if (transfercode == airports_arr[j].code) {
                                flight_data.transferCity = airports_arr[j].name;
                            }
                        }
                        var carrier_arr = response.trips.data.carrier;
                        for (var e = 0; e < carrier_arr.length; e++) {
                            flight_data.carrier.push(carrier_arr[e].name);
                        }
                        flight_data.carrier = flight_data.carrier.join(', ');
                        flight_data.pricing = response.trips.tripOption[0].saleTotal;
                    }
                }
                //else we have a round trip
                else {
                    var wholesegment1 = response.trips.tripOption[0].slice[0].segment;
                    if (wholesegment1.length < 2) {
                        //get the carrier for the first flight
                        var carrierCode = wholesegment1[0].flight.carrier;
                        for (var x = 0; x < response.trips.data.carrier.length; x++) {
                            if (carrierCode !== response.trips.data.carrier[x].code) {
                                continue;
                            }
                            else {
                                flight_data.carrier[0] = response.trips.data.carrier[x].name;
                            }
                        }

                        flight_data.pricing = response.trips.tripOption[0].saleTotal;
                    }
                    else {
                        var transfercode = wholesegment1[0].leg[0].destination;
                        for (var j = 0; j < airports_arr.length; j++) {
                            //compare transfercode and codes in the airports array - difficult way to get the name of transfer city
                            if (transfercode == airports_arr[j].code) {
                                flight_data.transferCity = airports_arr[j].name;
                            }
                        }
                        var carrierCodes = [];
                        carrierCodes.push(wholesegment1[0].flight.carrier, wholesegment1[1].flight.carrier);
                        for (var e = 0; e < response.trips.data.carrier.length; e++) {
                            if (carrierCodes[0] == response.trips.data.carrier[e].code) {
                                flight_data.carrier[0] == response.trips.data.carrier[e].name;
                                console.log("Carrier[0]: ", flight_data.carrier[0]);
                            }
                            if (carrierCodes[1] == response.trips.data.carrier[e].code) {
                                flight_data.carrier[1] = response.trips.data.carrier[e].name;
                                console.log("Carrier[1]: ", flight_data.carrier[1]);
                            }
                        }
                        if ((flight_data.carrier.length < 2) || (flight_data.carrier[0] == flight_data.carrier[1])) {
                            flight_data.carrier = flight_data.carrier[0];
                        }
                        
                        else {
                            if (flight_data.carrier[0] === undefined) {
                                flight_data.carrier = flight_data.carrier[1];
                            }
                            else if (flight_data.carrier[1] === undefined) {
                                flight_data.carrier = flight_data.carrier[0];
                            }
                            else {
                                flight_data.carrier = flight_data.carrier.join(', ');
                            }

                        }
                        
                        flight_data.pricing = response.trips.tripOption[0].saleTotal;
                    }
                    var wholesegment2 = response.trips.tripOption[0].slice[1].segment;
                    if (wholesegment2.length < 2) {
                        //get the carrier for the first flight
                        var carrierCode = wholesegment2[0].flight.carrier;
                        for (var y = 0; y < response.trips.data.carrier.length; y++) {
                            if (carrierCode !== response.trips.data.carrier[y].code) {
                                continue;
                            }
                            else {
                                flight_data.carrier2[0] = response.trips.data.carrier[y].name;
                            }
                        }
                    }
                    else {
                        var transfercode2 = response.trips.tripOption[0].slice[1].segment[0].leg[0].destination;
                        for (var j = 0; j < airports_arr.length; j++) {
                            //compare the codes and find the name of transfer city
                            if (transfercode == airports_arr[j].code) {
                                flight_data.transferCity2 = airports_arr[j].name;
                            }
                        }
                        var carrierCodes = [];
                        carrierCodes.push(wholesegment2[0].flight.carrier, wholesegment2[1].flight.carrier);
                        for (var h = 0; h < response.trips.data.carrier.length; h++) {
                            if (carrierCodes[0] == response.trips.data.carrier[h].code) {
                                flight_data.carrier2[0] == response.trips.data.carrier[h].name;
                            }
                            if (carrierCodes[1] == response.trips.data.carrier[h].code) {
                                flight_data.carrier2[1] = response.trips.data.carrier[h].name;
                            }
                        }
                        if ((flight_data.carrier2.length < 2) || (flight_data.carrier2[0] == flight_data.carrier2[1])) {
                            flight_data.carrier2 = flight_data.carrier2[0];
                        }

                        else {
                            if (flight_data.carrier2[0] === undefined) {
                                flight_data.carrier2 = flight_data.carrier2[1];
                            }
                            else if (flight_data.carrier2[1] === undefined) {
                                flight_data.carrier2 = flight_data.carrier2[0];
                            }
                            else {
                                flight_data.carrier2 = flight_data.carrier2.join(', ');
                            }

                        }


                    }
                }
            }

        }
    return flight_data;

    };

    module.prettyDate = function(respObj,flightsegment) {
        //flightsegment is the slice array of response. If the array has only 1 element, this is a one way trip.
        // Else this is a round way trip, so we have to double all formatting procedures.
        var segment1 = flightsegment[0].segment;
        var leg1 = segment1[0].leg;
        var leg2 = undefined;
        // format the first part of trip: one way flight date-and-time or the departure of round way flight
        if (segment1.length < 2) {
            //so this is a nonstop one way flight - the simplest case
            respObj.nonstop = true;
            //we need to format this raw data and make a pretty string of departure
            var rawDeparture = leg1[0].departureTime;
            var departureDate = rawDeparture.split('T')[0];
            var depRawTime = rawDeparture.split('T')[1];
            var depTime = depRawTime.substr(0, 5);
            respObj.departure = departureDate + ' ' + depTime;
            var rawArrival = leg1[0].arrivalTime;
            var arrivalDate = rawArrival.split('T')[0];
            var arrivalRawTime = rawArrival.split('T')[1];
            var arrTime = arrivalRawTime.substr(0, 5);
            respObj.arrival = arrivalDate + ' ' + arrTime;
            respObj.transferTime = '';

        }
        else {
            leg2 = segment1[1].leg;
            respObj.nonstop = false;
            //we need to format this raw data and make a pretty string of departure
            var rawDeparture = leg1[0].departureTime;
            var departureDate = rawDeparture.split('T')[0];
            var depRawTime = rawDeparture.split('T')[1];
            var depTime = depRawTime.substr(0, 5);
            respObj.departure = departureDate + ' ' + depTime;
            //and now make the same for the arrival formatting
            var rawArrival = leg2[0].arrivalTime;
            var arrivalDate = rawArrival.split('T')[0];
            var arrivalRawTime = rawArrival.split('T')[1];
            var arrTime = arrivalRawTime.substr(0, 5);
            respObj.arrival = arrivalDate + ' ' + arrTime;
            var rawTransferArrival = leg1[0].arrivalTime;
            var transferArrival = rawTransferArrival.split('T')[1].substr(0, 5);
            var rawTransferDeparture = leg2[0].departureTime;
            var transferDeparture = rawTransferDeparture.split('T')[1].substr(0, 5);
            respObj.transferTime = transferArrival + ' - ' + transferDeparture;
        }

        //if this is a round way trip
        if (flightsegment.length > 1) {
            var segment2 = flightsegment[1].segment;
            var leg3 = segment2[0].leg;
            var leg4 = undefined;
            if (segment2.length < 2) {
                respObj.nonstopreturn = true;
                //we need to format this raw data and make a pretty string of departure
                var rawDeparture = leg3[0].departureTime;
                var departureDate = rawDeparture.split('T')[0];
                var depRawTime = rawDeparture.split('T')[1];
                var depTime = depRawTime.substr(0, 5);
                respObj.departure2 = departureDate + ' ' + depTime;
                var rawArrival = leg3[0].arrivalTime;
                var arrivalDate = rawArrival.split('T')[0];
                var arrivalRawTime = rawArrival.split('T')[1];
                var arrTime = arrivalRawTime.substr(0, 5);
                respObj.arrival2 = arrivalDate + ' ' + arrTime;
                respObj.transferTime2 = '';
            }
            else {
                respObj.nonstopreturn = false;
                leg4 = segment2[1].leg;
                //we need to format this raw data and make a pretty string of departure2
                var rawDeparture = leg3[0].departureTime;
                var departureDate = rawDeparture.split('T')[0];
                var depRawTime = rawDeparture.split('T')[1];
                var depTime = depRawTime.substr(0, 5);
                respObj.departure2 = departureDate + ' ' + depTime;
                //and now make the same for the arrival2 formatting
                var rawArrival = leg4[0].arrivalTime;
                var arrivalDate = rawArrival.split('T')[0];
                var arrivalRawTime = rawArrival.split('T')[1];
                var arrTime = arrivalRawTime.substr(0, 5);
                respObj.arrival2 = arrivalDate + ' ' + arrTime;
                var rawTransferArrival = leg3[0].arrivalTime;
                var transferArrival = rawTransferArrival.split('T')[1].substr(0, 5);
                var rawTransferDeparture = leg4[0].departureTime;
                var transferDeparture = rawTransferDeparture.split('T')[1].substr(0, 5);
                respObj.transferTime2 = transferArrival + ' - ' + transferDeparture ;

            }
        }
        return respObj;
    };


    module.get_airport_code = function(parameters) {

        var code_promise = $.Deferred();

        $.getJSON($SCRIPT_ROOT + '/get_airport_code', {
            parameters
        })
            .done(function (data, textStatus, jqXHR) {
                code_promise.resolve(data.results);

              })
            .fail(function (jqXHR, textStatus, errorThrown) {

                // log error to browser's console
                console.log(errorThrown.toString());
            });
        return code_promise;
    };

    return module;

})(module || {});

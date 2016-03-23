/*
 * This is a separate module where all changes of flight search parameters would be saved.
 * After work with modal (id="param") price, passengers count, dates and origin airports would be hold in
  * flight_parameters object,
 */

(function(module) {

    //let user choose or change parameters for search in a special modal window
    module.change_parameters = function(buttonsArray, codesArray) {

        var promise = $.Deferred();
        //flag for check of submitting form
        var submitflag = false;
        //local variable for keep altogether for promise resolving
        var flight_parameters = {
            passengers: undefined,
            date_to: undefined,
            date_return: undefined,
            price: undefined,
            origin_names: undefined,
            edit_origin: undefined,
            coordinates: [null]    //latitude and longitude for the origin marker if user type the airport manually in the modal window
        };
        flight_parameters.codes_are_saved = module.flight_parameters.codes_are_saved;
            //flag for origins: default or saved from the map
        var codesSaved = undefined;
        $("#param").modal();
        //$("#param").on('show.bs.modal', function() {
            $('#adult-spinner').spinner({
                min: 1,
                max: 5,
                step: 1
            });
            $('#child-spinner').spinner({
                min: 0,
                max: 5,
                step: 1
            });

            $('.spinner').bind("keydown", function (event) {
                event.preventDefault();
            });

            //initialize datepicker for the one way date
            $("#date1").datepicker({
                minDate: 0,
                maxDate: '+6M',
                dateFormat: "yy-mm-dd"
            });
            //initialize 2 datepickers for the round way (departure and return)
            $("#date2").datepicker({
                minDate: 0,
                maxDate: '+6M',
                dateFormat: "yy-mm-dd"
            });
            $("#date3").datepicker({
                minDate: 1,
                maxDate: '+6M',
                dateFormat: "yy-mm-dd"
            });

            //maximum price for flight
            $("#price-slider").slider({
                range: "max",
                min: 100,
                max: 5000,
                step: 100,
                value: 500,
                slide: function (event, ui) {
                    $("#maxprice").val(ui.value + "$");
                }
            });


            //let user choose which airports will be origins of flight
            //by default it's user's geolocation
            var chooseNames = [];
            var chooseCodes = [];
            //var codeAndName = module.setDefaultOrigins(module.user_marker);
            if (module.user_marker.origins.length > 0) {
                for (var k = 0; k < module.user_marker.origins.length; k++) {
                    chooseNames.push(module.user_marker.origins[k].origin_name);
                    chooseCodes.push(module.user_marker.origins[k].origin_iata);
                }
            }

            var savedOnMap = [];
            //if user hasn't yet save marker's airports as future origins
            if (flight_parameters.codes_are_saved === false) {
                codesSaved = false;
                //3 buttons for 3 possible airports
                $("#choose-0").text(chooseNames[0] + ' ').append('<span class="badge"> &times;</span>');
                $("#choose-1").text(chooseNames[1] + ' ').append('<span class="badge"> &times;</span>').attr("class", "btn btn-md btn-from inactive").show();
                if (chooseNames[2] !== undefined) {
                    $("#choose-2").text(chooseNames[2] + ' ').append('<span class="badge"> &times;</span>').show();
                }
                else {
                    $("#choose-2").hide();
                }
                $("#return").hide();
            }
            //case if user has already set the marker's airports as origins
            else {
                codesSaved = true;
                for (var g = 0; g < buttonsArray.length; g++) {
                    savedOnMap[g] = buttonsArray[g];
                }
                $("#origins").text("You've chosen these airports as origins:");
                $("#choose-0").text(savedOnMap[0] + ' ').append('<span class="badge"> &times;</span>').attr("class", "btn btn-md btn-from active");
                if (buttonsArray.length > 1) {
                    $("#choose-1").text(savedOnMap[1] + ' ').append('<span class="badge"> &times;</span>').attr("class", "btn btn-md btn-from active");
                }
                else {
                    $("#choose-1").hide();
                }
                $("#return").show();
                $("#choose-2").hide();
                flight_parameters.origin_names = codesArray;
            }

            //count adults and children with spinners
            var adult_param = $("#adult-spinner").val();
            var child_param = $("#child-spinner").val();
            $("#adult-spinner").on("spinchange", function (event, ui) {
                adult_param = $("#adult-spinner").val();
            });

            $("#child-spinner").on("spinchange", function (event, ui) {
                child_param = $("#child-spinner").val();
            });
            var passengers = {
                "adultCount": 1,
                "childCount": 0
            };
            //choose maximum price for tickets with slider
            var maxprice = "USD" + $("#maxprice").val().slice(0, -1);
            $("#price-slider").slider({
                stop: function (event, ui) {
                    maxprice = "USD" + $("#maxprice").val().slice(0, -1);
                }
            });
            //choose tomorrow day for departure as default
            //by default we propose only one way flight
            var def_departure = module.get_date();
            //this var holds date from calendar if any was chosen
            var chosenDeparture = '';
            //date of return if flight will be round
            var return_date = '';
            //array for saving origin airports
            var airports_origin = [];
            //choose date for the one way flight
            $("#date1").on('change', function () {
                chosenDeparture = $(this).val();
            });

            //choose date of departure for round way
            $("#date2").on('change', function() {
                chosenDeparture = $(this).val();
                var dateOfReturn = $("#date2").datepicker('getDate');    //make a condition that date of return must be 1 day after the selected date of departure
                dateOfReturn.setDate(dateOfReturn.getDate() + 1);
                $("#date3").datepicker('option', 'minDate',dateOfReturn);
            });
            //choose date of return for round way
            $("#date3").on('change', function() {
                return_date = $(this).val();
            });

            //object for saving all default parameters
            var default_parameters = {
                passengers: passengers,
                date_to: def_departure,
                date_return: return_date,
                price: maxprice,
                origin_names: [chooseCodes[0], chooseCodes[2]], // this is SVO and DME for Moscow, my home marker
                edit_origin: false,
                codes_are_saved: undefined,     //this flag will show us whether user left the origins by default or left the saved from map airports
                coordinates: [null]
            };
            //if user changes some values
            var submitted_parameters = {};
            submitted_parameters.codes_are_saved = undefined;
            submitted_parameters.edit_origin = undefined;
            submitted_parameters.coordinates = undefined;

            $("#return").on("click", function () {
                codesSaved = false;
                //if user wants to restore default airports
                $("#choose-0").text(chooseNames[0] + ' ').append('<span class="badge"> &times;</span>');
                $("#choose-1").text(chooseNames[1] + ' ').append('<span class="badge"> &times;</span>').show();
                if (chooseNames[2] !== undefined) {
                    $("#choose-2").text(chooseNames[2] + ' ').append('<span class="badge"> &times;</span>').show();
                }
                else {
                    $("#choose-2").hide();
                }
                $("#return").hide();

            });

            //user can "disable" airports by one click and then "re-enable" them by another click. Buttons remain clickable,
            //only their color is changing
            $(".btn-from").off('click');
            $(".btn-from").on('click', function () {
                $(this).toggleClass('active');
                $(this).toggleClass('inactive');
            });

            //Let user edit airport of origin manually
            var popovercontent = '<form id="popovercont"><input id="content" type="text"/></form><button id="ok" class="btn btn-success btn-sm">Ok</button>';

            //if user wants to change origin airports
            $('#edit').popover({
                placement: 'bottom',
                animation: true,
                html: true,
                title: "Enter airport's iata code (3 letters): ",
                content: popovercontent
            });
            //make popover hidden if user clicks outside the popover area
            $(document).on("click", function (e) {
                $('[data-toggle=popover]').each(function () {
                    if (!$(this).is(e.target) && $(this).has(e.target).length === 0 && $('.popover').has(e.target).length === 0) {
                        $(this).popover('hide');
                    }

                });
            });
            //variable to hold manually typed iata
            var popover_airport = '';
            //save airport's iata code if user wants to type it manually
            $(document).off('keydown', '#content');
            $(document).on('keydown', "#content", function (event) {
                //prevent loading page after 'Enter' is pressed
                if (event.which == 13) {
                    event.preventDefault();
                    popover_airport = $("#content").val();

                    if (popover_airport.length !== 3) {
                        module.showAlert();
                    }
                    else {
                        popover_airport = popover_airport.toUpperCase();
                        $("#choose-1").hide();
                        $("#choose-2").hide();
                        $("#return").hide();
                        $("#choose-0").text(popover_airport);
                        flight_parameters.edit_origin = true;
                        codesSaved = false;
                        $("#return").show();
                        //check if there is uch code in our database
                        $.when(module.new_origin(popover_airport)).done(function (coordinates) {
                            //if we hadn't found this code in our database, we'll send this message to scripts.js and return to the default origins
                            if (coordinates.length == 0) {
                               submitted_parameters.coordinates = ["There is no such code in the database"];
                            }
                            else {
                                submitted_parameters.coordinates = coordinates;
                            }
                        });
                    }
                }

            });
            $(document).off('click', "#ok");
            $(document).on('click', "#ok", function (e) {
                popover_airport = $("#content").val();
                if (popover_airport.length === 3) {
                    popover_airport = popover_airport.toUpperCase();
                    $("#choose-1").hide();
                    $("#choose-2").hide();
                    $("#return").hide();
                    $("#choose-0").text(popover_airport).toggleClass('inactive').toggleClass('active');
                    flight_parameters.edit_origin = true;
                    codesSaved = false;
                    $("#return").show();
                    //check if there is uch code in our database
                    $.when(module.new_origin(popover_airport)).done(function (coordinates) {
                        if (coordinates.length == 0) {
                            //if we hadn't found this code in our database, we'll send this message to scripts.js and return to the default origins
                            submitted_parameters.coordinates = ["There is no such code in the database"];
                        }
                        else {
                            submitted_parameters.coordinates = coordinates;
                        }
                    });
                }
                else {
                    module.showAlert();
                    e.preventDefault();
                    e.stopPropagation();
                }
            });

            default_parameters.codes_are_saved = codesSaved;

            //when user submits all chosen values save them
            $('#btn-submit').off('click');
            $('#btn-submit').on('click', function () {

                passengers = {
                    "adultCount": adult_param,
                    "childCount": child_param
                };
                if (airports_origin.length > 0) {
                    airports_origin.length = 0;
                }
                if (flight_parameters.edit_origin === true) {
                      //so user typed a correct iata code and we have found it in the airports' database
                      if ((submitted_parameters.coordinates[0].length > 1) && (typeof(submitted_parameters.coordinates[0]) !== 'string')) {
                          airports_origin.push(popover_airport);
                          submitted_parameters.codes_are_saved = codesSaved;
                          submitted_parameters.edit_origin = true;
                      }
                      else {
                          submitted_parameters.edit_origin = undefined;
                          airports_origin = default_parameters.origin_names;
                      }

                }
                else {
                    //when user submit form, choose only those airports which had active buttons
                    var buttons = $(".btn.btn-md.btn-from");
                    buttons.filter('.active').each(function (index, elem) {
                        var buttontext = $(elem).text();
                        var origin_name = buttontext.substring(0, buttontext.length - 3);

                        airports_origin.push(origin_name);
                        submitted_parameters.codes_are_saved = codesSaved;
                        if (airports_origin.length > 1) {
                            airports_origin.pop();
                        }
                    });
                    if (airports_origin.length == 0) {
                        airports_origin = default_parameters.origin_names;
                        codesSaved = false;
                    }

                }

                submitted_parameters.passengers = passengers;
                if (chosenDeparture.length) {
                    submitted_parameters.date_to = chosenDeparture;
                }
                else {
                    submitted_parameters.date_to = def_departure;
                }

                submitted_parameters.date_return = return_date;
                submitted_parameters.price = maxprice;
                submitted_parameters.origin_names = airports_origin;
                submitted_parameters.choice = "submitted";
                submitflag = true;
            });

        //cancel the previous events of hiding modal
        $('#param').off("hide.bs.modal");
        $("#param").on("hide.bs.modal", function() {
            //submitflag shows us which parameters - default or submitted by modal(form) - we save
            if (submitflag == true) {
                flight_parameters.choice = "submitted";
                flight_parameters = submitted_parameters;
            }
            else {
                flight_parameters.choice = "default";
                flight_parameters = default_parameters;
                console.log("Default parameters: ", flight_parameters);
                if (flight_parameters.codes_are_saved === true) {
                    flight_parameters.origin_names = codesArray;
                }
            }
            $('#maxprice').val(500 + '$'); //reset the value of price slider label to 500$

            promise.resolve(flight_parameters);
        });

        return promise;

    };

    module.showAlert = function() {
        $('.alert').off();
        $('.alert').show();

        $(document).on('click', function (event) {
            var $alert = $('.alert');
            if (event.target !== $alert) {
                $alert.hide();
            }
        });
    };

    return module;

})(module || {});

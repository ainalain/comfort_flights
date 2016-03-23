/*
 *This is a separate module for get the capital of country if button "Show airports" isn't pressed.
 *Capitals are saved in capitals table from GitHub: https://github.com/mledoze/countries
*/

(function(module) {

    //get capital from table capitals if user wants to see only 1 marker of chosen country
    module.get_capital = function(country) {
        var promise = $.Deferred();
        var parameters = country;
        $.getJSON($SCRIPT_ROOT + '/capital', {parameters})
            .done(function (data, textStatus, jqXHR) {
                promise.resolve(data.results[0][0]);
            })
            .fail(function (jqXHR, textStatus, errorThrown) {

                // log error to browser's console
                console.log(errorThrown.toString());
            });
        return promise;
    };

    //get the coordinates of the city which the user had manually typed and submitted in the modal as new origin
    //we need the coordinates because we will show this city as origin marker on the map
    module.new_origin = function(code) {
        var coord_promise = $.Deferred();
        var parameters = code;
        $.getJSON($SCRIPT_ROOT + '/new_origin', {parameters})
            .done(function (data, textStatus, jqXHR) {
                coord_promise.resolve(data.results);
            })
            .fail(function (jqXHR, textStatus, errorThrown) {

                // log error to browser's console
                console.log(errorThrown.toString());
            });
        return coord_promise;
    }

})(module || {});
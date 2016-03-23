/*
 *This is a separate small module for determine default of flight date:
 * it will be tomorrof from the user's current date
 */


(function(module) {

    module.get_date = function() {

        var departure = '';
        var current_date = new Date();
        var tomorrow_day = undefined;
        var tomorrow_month = undefined;
        var tomorrow_year = current_date.getFullYear();
        var big_months = [0, 2, 4, 6, 7, 9, 11];
        if ((current_date.getMonth() == 1) && (current_date.getDate() == 28)) {
            tomorrow_day = 1;
            tomorrow_month = 3;
        }
        else if (current_date.getDate() == 30) {
            if ($.inArray(current_date.getMonth(), big_months) > -1) {
                tomorrow_day = 31;
                tomorrow_month = current_date.getMonth() + 1;

            }
            else {
                tomorrow_day = 1;
                tomorrow_month = current_date.getMonth() + 2;
            }
        }
        else if (current_date.getDate() == 31) {
            if (current_date.getMonth() == 11) {
                tomorrow_day = 1;
                tomorrow_month = 1;
                tomorrow_year = current_date.getFullYear() + 1;
            }
            else {
                tomorrow_day = 1;
                tomorrow_month = current_date.getMonth() + 2;
            }
        }
        else {
            tomorrow_day = current_date.getDate() + 1;
            tomorrow_month = current_date.getMonth() + 1;
        }
        departure = tomorrow_year.toString() + '-' + tomorrow_month.toString() + '-' + tomorrow_day.toString();
        module.flight_parameters["date_to"] = departure;

        return module.flight_parameters["date_to"];
    };

    return module;

})(module || {});
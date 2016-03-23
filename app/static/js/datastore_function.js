/*
 *Save new received values from different functions (get suggestion, get clicked coordinates etc.)
 */
module.fnCalled = function(data_for_store) {
    //var called = false;
    var datastore = [];
    if (data_for_store != undefined) {

        datastore[0] = data_for_store[0];
        datastore[1] = data_for_store[1];
        console.log("Data store: ", datastore);
        //return datastore;
    }
    else {
        console.log("Undefined suggestion");
        datastore[0] = undefined;
        datastore[1] = undefined;
        // return datastore;
    }

    // console.log("Data store: ", datastore);
    return datastore;
};
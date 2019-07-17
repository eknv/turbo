/**
 * Q wrapper object for the necessary bluebird methods
 */
var Q = {

    defer: function () {
        var resolve, reject;
        var promise = new Promise(function () {
            resolve = arguments[0];
            reject = arguments[1];
        });
        return {
            resolve: resolve,
            reject: reject,
            promise: promise
        };
    },

    all: Promise.all,

    /*fail: Promise.catch*/
}

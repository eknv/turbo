'use strict';

angular.module('turboApp')

    .factory('LazyService', function () {
        return {
            doIt: function (content) {
                var fn;
                console.log(content);
                eval("fn = new function() {" + content + "}");
                console.log(fn);
                return fn;
            }
        };
    })


;

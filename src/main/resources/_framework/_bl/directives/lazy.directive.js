'use strict';

angular.module('turboApp')

.directive('lazy', function($compile, $timeout, LazyService) {
    return {
        restrict: "E",
        scope: {
            _view: '@view',
            _fn: '=fn'
        },
        link: function(scope, element, attrs) {
            var content = scope._fn;
            $timeout(function () {
                scope.vm = LazyService.doIt(content);
            })
            console.log(scope);
            element.html(scope._view).show();
            $compile(element.contents())(scope);
        }
    }
});


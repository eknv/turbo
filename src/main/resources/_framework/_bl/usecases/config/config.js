angular.module('turboApp').controller('configCtrl', function ($rootScope, $scope, Action) {


    $scope.updateConfig = function () {
        Action.execute('updateConfig', [
            $rootScope.config
        ]).then(function (result) {

        });
    }



});

var app = angular.module('entityEditor')

        .directive('autoForm', function () {
            return {
                templateUrl: "client/directives/autoForm.html",
                restrict: "E",
                scope: {
                    category: "@",
                    section: '=',
                    options: '=',
                    models: '=',
                    currentModel: '=',
                    currentField: '='
                },
                link: function (scope, el, attrs) {


                },
                controller: function ($scope, $rootScope) {

                    if ($scope.category == "relationship") {
                        $scope.$watch('[currentField.type, currentField.relationship.relationshipType]', function (newValue, oldValue) {
                            $scope.updateReferencedAndMappedByFields();
                            if($scope.hasValue($scope.currentField.type)) {
                                var fieldsOfType = $scope.retrieveAllPrimitiveAndSpecialFields($scope.currentField.type);
                                $rootScope.addToFirstUnique($scope.options.mapKey.list, fieldsOfType);
                                $rootScope.addToFirstUnique($scope.options.orderBy.list, fieldsOfType);
                            }
                        }, true);
                    }

                    $scope.updateReferencedAndMappedByFields = function() {
                        if (!$scope.hasValue($scope.currentField.type)) {
                            $scope.section.relationshipType = '';
                            $scope.section.referencedBy = '';
                            $scope.section.mappedBy = '';
                        } else if ($.inArray($scope.currentField.type, $scope.options.primitiveType.list) !== -1) {
                            $scope.section.referencedBy = '';
                            $scope.section.mappedBy = '';
                        } else if ($scope.hasValue($scope.section.relationshipType)) {
                            $scope.options.referencedBy.list = [''];
                            $scope.options.mappedBy.list = [''];
                            for (var i = 0; i < $scope.models.length; i++) {
                                var model = $scope.models[i];
                                for (var j = 0; j < model.fields.length; j++) {
                                    var field = model.fields[j];
                                    if (model.name == $scope.currentField.type
                                        && field.type == $scope.currentModel.name
                                        && ($scope.currentModel.name != model.name || field.name != $scope.currentField.name)
                                        && $scope.areRelationshipTypesMatch(field.relationship.relationshipType, $scope.currentField.relationship.relationshipType)) {
                                        $scope.options.referencedBy.list.push(field.name);
                                        /**
                                         * if the the relationship-type on this field is many-to-many
                                         * and the mapped-by field on the other side does not have any value
                                         * then add the related field name to the mapped-by field on this side
                                         */
                                        if ($.inArray($scope.section['relationshipType'].toLowerCase(), ['manytomany', 'onetomany', 'onetoone']) !== -1
                                            && field.relationship.mappedBy=="") {
                                            $scope.options.mappedBy.list.push(field.name);
                                        }
                                    }
                                }
                            }
                        }
                    }


                    $scope.retrieveAllPrimitiveAndSpecialFields = function (entity) {
                        var fieldNames = [];
                        for (var i = 0; i < $scope.models.length; i++) {
                            var model = $scope.models[i];
                            if (model.name != entity) {
                                continue;
                            }
                            for (var j = 0; j < model.fields.length; j++) {
                                var field = model.fields[j];
                                if ($.inArray(field.type, $scope.options.primitiveType.list) !== -1
                                    || $.inArray(field.type, $scope.options.specialType.list) !== -1) {
                                    fieldNames.push(field.name);
                                }
                            }
                        }
                        return fieldNames;
                    }


                    $scope.retrieveAllPrimitiveAndSpecialFields = function (entity, type) {
                        var fieldNames = [];
                        for (var i = 0; i < $scope.models.length; i++) {
                            var model = $scope.models[i];
                            if (model.name != entity) {
                                continue;
                            }
                            for (var j = 0; j < model.fields.length; j++) {
                                var field = model.fields[j];
                                if ($.inArray(field.type, $scope.options.primitiveType.list) !== -1
                                    || $.inArray(field.type, $scope.options.specialType.list) !== -1) {
                                    fieldNames.push(field.name);
                                }
                            }
                        }
                        return fieldNames;
                    }


                    $scope.updateRelatedObjects = function (key) {
                        if (key == 'relationshipType') {
                            if (!$scope.hasValue($scope.section.relationshipType)) {
                                $scope.section.referencedBy = '';
                                $scope.section.mappedBy = '';
                            } else if ($.inArray($scope.section.relationshipType.toLowerCase(), ['manytomany', 'onetomany', 'onetoone']) == -1) {
                                $scope.section.mappedBy = '';
                            }
                        }
                    }

                    $scope.areRelationshipTypesMatch = function (relationshipType1, relationshipType2) {
                        if (!$scope.hasValue(relationshipType1) || !$scope.hasValue(relationshipType2)) {
                            return false;
                        } else if (relationshipType1.toLowerCase() == "manytomany" && relationshipType2.toLowerCase() == "manytomany") {
                            return true;
                        } else if (relationshipType1.toLowerCase() == "onetomany" && relationshipType2.toLowerCase() == "manytoone") {
                            return true;
                        } else if (relationshipType1.toLowerCase() == "manytoone" && relationshipType2.toLowerCase() == "onetomany") {
                            return true;
                        } else if (relationshipType1.toLowerCase() == "onetoone" && relationshipType2.toLowerCase() == "onetoone") {
                            return true;
                        } else {
                            return false;
                        }
                    }

                    $scope.isOption = function (key) {
                        return $scope.options[key] != null && $scope.options[key].list != null;
                    }

                    $scope.isBoolean = function (key) {
                        return $scope.options[key] != null && $scope.options[key].boolean == true;
                    }

                    $scope.isText = function (key) {
                        return $scope.options[key] == null
                            || ($scope.options[key].list == null && $scope.options[key].boolean != true);
                    }

                    $scope.getOptions = function (key) {
                        $scope.updateRelatedObjects(key);
                        // for the primitive types, just one-to-many is allowed
                        if (key == 'relationshipType'
                            && $.inArray($scope.currentField.type, $scope.options.primitiveType.list) !== -1) {
                            return ['', 'Set'];
                        }
                        return $scope.options[key].list;
                    }

                    $scope.isDisabled = function (key) {

                        if($scope.currentField.name=="") {
                            return true
                        }

                        if (key == 'relationshipType') {
                            // For special types, no relationships are allowed
                            if ($scope.currentField.type == null || $scope.currentField.type.trim() == ''
                                || $.inArray($scope.currentField.type, $scope.options.specialType.list) !== -1) {
                                return true;
                            } else {
                                return false;
                            }
                            return true;
                        }
                        else if (key == 'eager') {
                            if ($scope.hasValue($scope.section.relationshipType)
                                && $scope.hasValue($scope.currentField.type)) {
                                return false;
                            } else {
                                return true;
                            }
                        }
                        else if (key == 'referencedBy') {
                            if ($scope.hasValue($scope.section.relationshipType)
                                && $scope.section.relationshipType.toLowerCase() != 'set'
                                && $scope.hasValue($scope.currentField.type)) {
                                return false;
                            } else {
                                return true;
                            }
                        }
                        else if (key == 'cascade') {
                            if ($scope.hasValue($scope.section.relationshipType)
                                && $scope.section.relationshipType.toLowerCase() != 'set'
                                && $scope.hasValue($scope.currentField.type)) {
                                return false;
                            } else {
                                return true;
                            }
                        }
                        else if (key == 'orphanRemoval') {
                            if ($scope.hasValue($scope.section.relationshipType)
                                && ($scope.section.relationshipType.toLowerCase() == 'onetomany' ||
                                        $scope.section.relationshipType.toLowerCase() == 'onetomany')) {
                                return false;
                            } else {
                                return true;
                            }
                        }

                        else if (key == 'fetchMode') {
                            if ($scope.hasValue($scope.section.relationshipType)
                                && $scope.section.relationshipType.toLowerCase() == 'onetomany') {
                                return false;
                            } else {
                                return true;
                            }
                        }
                        else if (key == 'mappedBy') {
                            if ($scope.section.relationshipType.toLowerCase() == 'manytomany'
                                || $scope.section.relationshipType.toLowerCase() == 'onetoone'
                                || $scope.section.relationshipType.toLowerCase() == 'onetomany'
                            ) {
                                return false;
                            } else {
                                return true;
                            }
                        }
                        else if (key == 'batchSize') {
                            if ($scope.section.fetchMode.toLowerCase() == 'select') {
                                return false;
                            } else {
                                return true;
                            }
                        }
                        else if (key == 'mapKey') {
                            if ($scope.hasValue($scope.section.relationshipType)
                                && $scope.section.relationshipType.toLowerCase() == 'onetomany'
                                && !$scope.hasValue($scope.section.orderBy)) {
                                return false;
                            } else {
                                return true;
                            }
                        }
                        else if (key == 'orderBy') {
                            if ($scope.section.relationshipType.toLowerCase() == 'onetomany'
                                && !$scope.hasValue($scope.section.mapKey)) {
                                return false;
                            } else {
                                return true;
                            }
                        }
                        else if (key == 'generator') {
                            if ($scope.currentField.type.toLowerCase() == 'id') {
                                return false;
                            } else {
                                return true;
                            }
                        }
                        else if (key == 'maxLow' || key == 'primaryKeyValue') {
                            if ($scope.currentField.type.toLowerCase() != 'id') {
                                return true;
                            } else if ($scope.section.generator.toLowerCase() == 'hilo') {
                                return false;
                            } else {
                                return true;
                            }
                        }
                        else if (key == 'generatorName') {
                            if ($scope.currentField.type.toLowerCase() != 'id') {
                                return true;
                            } else if ($scope.section.generator.toLowerCase() == 'custom') {
                                return false;
                            } else {
                                return true;
                            }
                        }

                        return false;
                    }

                    $scope.hasValue = function (value) {
                        if (value == null || value.trim() == '') {
                            return false;
                        }
                        return true;
                    }
                }
            }
        })

    ;



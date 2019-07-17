'use strict';

angular.module('turboApp')

    .directive('turboModelFull', function (ngDialog) {
        return {
            templateUrl: "resource?directive=turboModelFull.html",
            restrict: "E",
            scope: {
                modelName: "@",
                showSearch: "@", // boolean whether to display the search section or not
                showPreview: "@", // boolean whether to display the preview section or not

                assignment: "=?",
                selectMethod: "=?"
            },
            link: function (scope, el, attrs) {

            },
            controller: function ($rootScope, $compile, $interval,
                                  $scope, $translate, Action, $controller, $timeout,
                                  $state, uiGridConstants, Objects) {

                /**
                 * pass the service
                 */
                $scope.Objects = Objects;

                $scope.assignment = {}

                $scope.showSearchSection = function () {
                    if ($scope.showSearch != null && $scope.showSearch == "true") {
                        return true;
                    }
                    return false;
                }

                $scope.showPreviewSection = function () {
                    if ($scope.showPreview != null && $scope.showPreview == "true") {
                        return true;
                    }
                    return false;
                }


                /**
                 * Set the size of the search, grid and preview sections
                 */
                if (!$scope.showSearchSection() && !$scope.showPreviewSection()) {
                    $scope.gridSectionWidth = 100;
                } else if (!$scope.showSearchSection()) {
                    $scope.gridSectionWidth = 65;
                    $scope.previewSectionWidth = 35;
                } else if (!$scope.showPreviewSection()) {
                    $scope.searchSectionWidth = 25;
                    $scope.gridSectionWidth = 75;
                } else {
                    $scope.searchSectionWidth = 22;
                    $scope.gridSectionWidth = 48;
                    $scope.previewSectionWidth = 30;
                }


                $scope.interfaceData = {};
                $scope.interfaceData.gridoptions = {};
                $scope.relationships = [];
                $scope.selectedParent = {};

                $scope.search = function () {
                    $scope.paginationOptions.pageNumber = 1;
                    $scope.getPage();
                }

                $scope.cellToolTip = function (row, col) {
                    return row.name;
                }

                $scope.headerToolTip = function (col) {
                    return col.name;
                }

                $scope.reset = function () {
                    $scope.criteria = {};
                    $scope.search();
                }

                $scope.pageOptions = {isView: false};

                $scope.canEdit = function () {
                    return false;
                    /**
                     * having different editors for different row of each column is not suppored yet
                     * in order to support this, probably custom templates should be provided for the columns
                     * this feature can be investigated later
                     * for now adding  new lines can be done just using the modal dialogs
                     * @returns {boolean}
                     */
                    //return $scope.pageOptions.isView;
                };
                $scope.enable = function () {
                    $scope.pageOptions.isView = true;
                    if ($scope.showPreviewSection()) {
                        $scope.previewGridApi.core.notifyDataChange(uiGridConstants.dataChange.ALL);
                    }
                }
                $scope.disable = function () {
                    $scope.pageOptions.isView = false;
                    if ($scope.showPreviewSection()) {
                        $scope.previewGridApi.core.notifyDataChange(uiGridConstants.dataChange.ALL);
                    }
                }

                $scope.previewGridOptions = {
                    enableSorting: true,
                    enableColumnResize: true,
                    enableCellEditOnFocus: true,
                    enableHorizontalScrollbar: uiGridConstants.scrollbars.ALWAYS,
                    enableVerticalScrollbar: uiGridConstants.scrollbars.ALWAYS,

                    columnDefs: [
                        {
                            name: "name",
                            enableCellEdit: false,
                            width: "*"
                        },
                        {
                            name: "value",
                            cellEditableCondition: $scope.canEdit,
                            width: "*"
                        }
                    ],
                    onRegisterApi: function (gridApi) {
                        $scope.previewGridApi = gridApi;
                        $scope.previewGridApi.edit.on.afterCellEdit($scope, function (rowEntity, colDef, newValue, oldValue) {
                            // update this part for adding new or updating
                        });

                        $scope.$on('ui.layout.resize', function (e, beforeContainer, afterContainer) {
                            $scope.previewGridApi.core.handleWindowResize();
                        });
                    }
                };


                $scope.preview = function (selectedEntity, isSelected) {
                    $scope.disable();
                    $scope.previewGridOptions.data = [];

                    /**
                     * if the row is no more selected, return
                     */
                    if (!isSelected) {
                        return;
                    }

                    angular.forEach($scope.interfaceData.gridoptions.columnDefs, function (columnDef, index) {
                        if ($scope.isRelationField(columnDef.relationship.relationshipType)) {
                            return;
                        }
                        $scope.previewGridOptions.data.push({
                            name: columnDef.name,
                            value: $scope.render(columnDef.type, selectedEntity[columnDef.name])
                        });
                    });
                }

                $scope.isRelationField = function (relationshipType) {
                    if (relationshipType != null
                        && (relationshipType.toLowerCase() == 'manytoone'
                        || relationshipType.toLowerCase() == 'onetomany'
                        || relationshipType.toLowerCase() == 'onetoone'
                        || relationshipType.toLowerCase() == 'manytomany')) {
                        return true;
                    }
                    return false;
                }

                $scope.render = function (type, value) {
                    if (value == null) {
                        return;
                    }
                    if (type == 'date') {
                        var date = moment(value);
                        return date.format("YYYY-MM-DD");
                    } else if (type == 'datetime') {
                        var dateTime = moment(value);
                        return dateTime.format("YYYY-MM-DD HH:mm");
                    } else if (type == 'time') {
                        var dateTime = moment(value);
                        return dateTime.format("HH:mm");
                    }
                    return value;
                }


                /**
                 * a list of the children assignments
                 */
                $scope.assignmentsForChildren = {};
                $scope.getAssignment = function (selectedParent, parentName, parentType, parentFieldName, childName, 
                                                 childFieldName, childNullable, interfaceData) {
                    var _childNullable = childNullable || childNullable == 'true' || childNullable == null;
                    /**
                     * in the following cases no assignment is allowed
                     * todo/kn.. maybe adjustment is necessary for onetoone case here
                     */
                    if (parentType != null &&
                        ((parentType.toLowerCase() == 'onetomany' && !_childNullable)
                        || (parentType.toLowerCase() == 'onetoone' && !_childNullable)
                        || parentType.toLowerCase() == 'manytoone')
                    ) {
                        return null;
                    }
                    var assignment = $scope.assignmentsForChildren[childName];
                    if (assignment != null) {
                        return assignment;
                    } else {
                        assignment = {}
                        assignment.assignMethod = function () {

                            if (selectedParent.id == null) {
                                alert("Please select a " + parentName + " first beforing assigning " + childName + " to it!");
                                return;
                            }

                            var assignmentScope = $scope.$new(true);
                            assignmentScope.setSelectedObject = function (selectedObject) {

                                // call a method on the server side to create the connection
                                Action.execute('turboModel-connectChildToParent', [
                                    parentType,
                                    parentName,
                                    parentFieldName,
                                    selectedParent.id,
                                    childName,
                                    childFieldName,
                                    selectedObject.id
                                ]).then(function (result) {
                                    /**
                                     * fill in the table
                                     */
                                    if (result == true && interfaceData.gridoptions != null && interfaceData.gridoptions.data != null) {
                                        interfaceData.gridoptions.data.unshift(selectedObject);
                                    }
                                });
                            }

                            assignmentScope.selectMethod = function (selectedObject) {
                                if (selectedObject == null) {
                                    alert("Select an entity first before selecting!")
                                    return
                                }
                                if (assignmentScope.dialog != null) {
                                    assignmentScope.dialog.close()
                                }
                                assignmentScope.setSelectedObject(selectedObject)
                            }

                            // bring up the dialog
                            assignmentScope.modelName = childName;
                            assignmentScope.dialog = ngDialog.open({
                                template: 'resource?directive=turboModel-selectionModal.html',
                                scope: assignmentScope,
                                className: 'ngdialog-theme-default dialogwidth_80_60',
                                closeByDocument: false,
                                cache: false
                            });

                        }


                        assignment.unassignMethod = function (selectedObject) {

                            if (selectedObject == null) {
                                alert("Please select a " + childName + " to unassign!");
                                return;
                            }

                            // call a method on the server side to create the connection
                            Action.execute('turboModel-disconnectChildFromParent', [
                                parentType,
                                parentName,
                                parentFieldName,
                                selectedParent.id,
                                childName,
                                childFieldName,
                                selectedObject.id
                            ]).then(function (result) {
                                /**
                                 * fill in the table
                                 */
                                if (result == true && interfaceData.gridoptions != null && interfaceData.gridoptions.data != null) {
                                    var index = interfaceData.gridoptions.data.indexOf(selectedObject);
                                    if (index > -1) {
                                        interfaceData.gridoptions.data.splice(index, 1);
                                    }
                                }
                            });
                        }


                        $scope.assignmentsForChildren[childName] = assignment;
                        return assignment;
                    }
                }

            }
        }
    })


    .directive('timepicker',
    ['gridUtil', 'uiGridConstants', 'uiGridEditConstants', '$timeout', 'uiGridEditService',
        function (gridUtil, uiGridConstants, uiGridEditConstants, $timeout, uiGridEditService) {
            return {
                require: ['?^uiGrid', '?^uiGridRenderContainer'],
                compile: function () {
                    return {
                        pre: function ($scope, $elm, $attrs) {

                        },
                        post: function ($scope, $elm, $attrs, controllers) {
                            var element = $elm[0].childNodes[0];
                            //set focus at start of edit
                            $scope.$on(uiGridEditConstants.events.BEGIN_CELL_EDIT, function (evt, triggerEvent) {
                                $timeout(function () {
                                    element.focus();
                                    //only select text if it is not being replaced below in the cellNav viewPortKeyPress
                                    if ($scope.col.colDef.enableCellEditOnFocus) {
                                        element.select();
                                    }
                                });

                                angular.element(element).bind("keydown keypress", function (event) {
                                    if (event.which === 13) {
                                        $scope.stopEdit(event);
                                    }
                                });

                            });

                            $scope.deepEdit = false;

                            $scope.stopEdit = function (evt) {
                                if ($scope.inputForm && !$scope.inputForm.$valid) {
                                    evt.stopPropagation();
                                    $scope.$emit(uiGridEditConstants.events.CANCEL_CELL_EDIT);
                                }
                                else {
                                    $scope.$emit(uiGridEditConstants.events.END_CELL_EDIT);
                                }
                                $scope.deepEdit = false;
                            };
                        }
                    };
                }
            };
        }])


// place-holder
    .directive('jointDiagram', [function () {

        var directive = {
            link: link,
            restrict: 'E',
            scope: {
                height: '=',
                width: '=',
                gridSize: '='
            }
        };
        return directive;

        function link(scope, element, attrs) {

            var graph = new joint.dia.Graph

            var diagram = newDiagram(scope.height, scope.width, scope.gridSize, graph, element[0]);

            //add event handlers to interact with the diagram
            diagram.on('cell:pointerclick', function (cellView, evt, x, y) {

                //your logic here e.g. select the element

            });

            diagram.on('blank:pointerclick', function (evt, x, y) {

                // your logic here e.g. unselect the element by clicking on a blank part of the diagram
            });

            diagram.on('link:options', function (evt, cellView, x, y) {

                // your logic here: e.g. select a link by its options tool
            });
        }

        function newDiagram(height, width, gridSize, graph, targetElement) {

            var paper = new joint.dia.Paper({
                el: targetElement,
                width: width,
                height: height,
                gridSize: gridSize,
                model: graph
            });

            var rect = new joint.shapes.basic.Rect({
                position: {x: 50, y: 70},
                size: {width: 100, height: 40}
            })
            graph.addCell(rect)

            return paper;
        }

    }])


;


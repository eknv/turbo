'use strict';

angular.module('turboApp')

    .directive('turboModel', function ($rootScope, uiGridConstants, Action, ngDialog, $timeout) {
        return {
            templateUrl: "resource?directive=turboModel.html",
            restrict: "E",
            scope: {
                modelName: "@",         // the model name of this grid
                relationships: '=',     // this array contains the relationships of a parent object to the respective children
                                        // this is populated by its children
                interfaceData: '=?',    // the data that needs to be exposed should be put inside this object

                preview: '=',           // this is  a preview function being passed from outside
                                        // it can be used to see the selected entity in this grid outside in a preview section

                selectedParent: "=",    // in case this grid has a parent, this specifies the selected parent object

                //todo/kn.. 20160113.. create an object for these attributes
                parentFieldName: '@',
                parentName: '@',
                parentType: '@',
                parentRelationship: '@',

                /**
                 * tab information
                 */
                active: "=",            // this flag specifies whether this grid is inside an active tab

                assignment: "=",      // if this method exists, show the assignment button.. this button would then call this method
                selectMethod: "="        // if this method exists, show the selection button.. this button would then call this method

            },
            link: function (scope, el, attrs) {


            },
            controller: function ($rootScope, $compile, $interval,
                                  $scope, $translate, Action, $controller, $timeout,
                                  $state, uiGridConstants, ngDialog, Objects) {

                $scope.paginationOptions = {
                    pageNumber: 1,
                    pageSize: 5,
                    sort: null
                };
                $scope.sortFields = null;
                $scope.gridApi = null;
                $scope.dialog = null;

                // possible options
                // https://github.com/angular-ui/ui-grid/wiki/Configuration-Options
                $scope.gridoptions = {
                    headerRowHeight: 30,
                    enableRowHeaderSelection: true,
                    paginationPageSizes: [5, 10, 25, 50, 75],
                    paginationPageSize: 5,
                    useExternalPagination: true,
                    useExternalSorting: true,
                    enableRowSelection: false,
                    multiSelect: false,
                    enableColumnReordering: true,
                    enableColumnResize: true,
                    enablePinning: true,
                    enableHighlighting: true,
                    showSelectionCheckbox: true,
                    selectionRowHeaderWidth: 30,
                    enableHorizontalScrollbar: uiGridConstants.scrollbars.ALWAYS,
                    enableVerticalScrollbar: uiGridConstants.scrollbars.ALWAYS,
                    onRegisterApi: function (gridApi) {
                        $scope.gridApi = gridApi;

                        $scope.gridApi.core.on.sortChanged($scope, function (grid, sortColumns) {
                            if (sortColumns.length == 0) {
                                $scope.sortFields = null;
                            } else {
                                var sortingTerm = "";
                                for (var i = 0; i < sortColumns.length; i++) {
                                    sortingTerm = sortingTerm.concat(' ' + sortColumns[i].field + ' ' + sortColumns[i].sort.direction);
                                    if (i != sortColumns.length - 1) {
                                        sortingTerm = sortingTerm + ",";
                                    }
                                }
                                $scope.sortFields = sortingTerm;
                            }
                            $scope.getPage();
                        });

                        $scope.gridApi.edit.on.afterCellEdit($scope, function (rowEntity, colDef, newValue, oldValue) {

                            if (oldValue == newValue) {
                                return;
                            }

                            // if a decimal number is not numeric, write back the previous value and return
                            if ((colDef.fieldType.toLowerCase() == 'decimal' || colDef.fieldType.toLowerCase() == 'integer')
                                && !jQuery.isNumeric(newValue)) {
                                rowEntity[colDef.name] = oldValue;
                                return;
                            }

                            // if integer number has decimal places, remove the decimal places
                            if ((colDef.fieldType.toLowerCase() == 'integer') && (newValue % 1 != 0)) {
                                newValue = Math.floor(newValue);
                                rowEntity[colDef.name] = newValue;
                            }


                            /**
                             * if something is changed on a relationship field but it has not been loaded from the server (by tabbing out)
                             * then just return
                             * **_$$editing is set to true after the related object is loaded from server
                             * if it is not loaded, it means they have changed the field but entered immediately before getting the value from the server side
                             */
                            if (rowEntity[colDef.name + "_$$id"] != null && !rowEntity[colDef.name + "_$$editing"]) {
                                rowEntity[colDef.name] = oldValue
                                return
                            }


                            Action.execute('turboModel-updateField', [
                                $scope.modelName,
                                colDef.name,
                                colDef.type,
                                $scope.$Value(newValue, colDef.fieldType),
                                rowEntity[colDef.name + "_$$id"],
                                rowEntity.id
                            ]).then(function (response) {
                                rowEntity[colDef.name + "_$$editing"] = false;
                                /**
                                 * if an update is not possible, bring back the old value
                                 */
                                if (response == 0) {
                                    rowEntity[colDef.name] = oldValue
                                }
                                if (typeof $scope.preview === "function") {
                                    $scope.preview(rowEntity, true);
                                }
                                console.log(response);
                            });
                        });

                        $scope.gridApi.pagination.on.paginationChanged($scope, function (newPage, pageSize) {
                            $scope.paginationOptions.pageNumber = newPage;
                            $scope.paginationOptions.pageSize = pageSize;
                            $scope.getPage();
                        });

                        $scope.gridApi.selection.on.rowSelectionChanged($scope, $scope.rowSelectionChanged);
                        $scope.gridApi.selection.on.rowSelectionChangedBatch($scope, $scope.rowSelectionChangedBatch);

                        $scope.$on('ui.layout.resize', function (e, beforeContainer, afterContainer) {
                            $scope.gridApi.core.handleWindowResize();
                        });

                    }
                };

                /**
                 * expose the gridoption in the interface data
                 */
                if ($scope.interfaceData != null) {
                    $scope.interfaceData.gridoptions = $scope.gridoptions;
                }

                $scope.$Value = function (value, fieldType) {
                    if (fieldType == null) {
                        return value;
                    }
                    if (fieldType.toLowerCase() == "date") {
                        // remove the offset
                        var date = new moment(value.getTime() - (1000 * 60 * value.getTimezoneOffset()));
                        var dateString = date.format("YYYY-MM-DD");
                        return "_date_:" + dateString;
                    } else if (fieldType.toLowerCase() == "datetime") {
                        var date = moment(value);
                        var dateString = date.format("YYYY-MM-DD HH:mm:ss");
                        return "_datetime_:" + dateString;
                    } else if (fieldType.toLowerCase() == "time") {
                        if (value instanceof Date) {
                            var date = moment(value);
                            return "_time_:" + date.format("HH:mm");
                        } else {
                            return "_time_" + value;
                        }
                    } else if (fieldType.toLowerCase() == "decimal") {
                        return "_decimal_:" + value;
                    } else if (fieldType.toLowerCase() == "integer") {
                        return "_integer_:" + value;
                    }
                    return value;
                }


                $scope.criteria = {};
                $scope.selected = null;
                $scope.optionsMap = {};


                $scope.getPage = function () {

                    var selectedParent = null;
                    if (!$rootScope.isNullOrEmpty($scope.selectedParent)) {
                        selectedParent = $scope.selectedParent.id;
                    }

                    var parentInfo = Objects.parentInfo($scope.parentFieldName,
                        $scope.parentName,
                        $scope.parentType,
                        $scope.parentRelationship,
                        selectedParent);

                    Action.execute('turboModel-read', [
                        $scope.modelName,
                        $scope.criteria,
                        $scope.paginationOptions,
                        $scope.sortFields,
                        parentInfo
                    ]).then(function (result) {

                        if (result != null) {
                            $scope.gridoptions.totalItems = result.totalItems;
                            $scope.gridoptions.columnDefs = result.metadata.fields;
                            $scope.gridoptions.data = result.data;
                        }

                        var setRelationships = false;
                        if ($scope.relationships && $scope.relationships.length == 0) {
                            setRelationships = true;
                        }

                        /**
                         * possible options:
                         * http://ui-grid.info/docs/#/api/ui.grid.class:GridOptions.columnDef
                         */
                        angular.forEach($scope.gridoptions.columnDefs, function (columnDef, index) {

                            /**
                             * if the field should not be displayed in the UI
                             */
                            if (setRelationships && !$rootScope.isNullOrEmpty(columnDef.relationship.relationshipType)) {
                                $scope.relationships.push(
                                    {
                                        parentName: $scope.modelName,
                                        parentFieldName: columnDef.relationship.referencedBy,
                                        parentType: columnDef.relationship.relationshipType,
                                        parentRelationship: columnDef.relationship,
                                        childName: columnDef.type,
                                        childFieldName: columnDef.name,
                                        childNullable: columnDef.nullable,
                                        data: {}
                                    });
                            }

                            // display just manytoone relationships
                            if (!$rootScope.isNullOrEmpty(columnDef.relationship.relationshipType) 
                                && !$rootScope.isReferring(columnDef.relationship.relationshipType, columnDef.relationship.mappedBy)) {
                                columnDef.visible = false;
                                return;
                            } else {
                                columnDef.visible = $rootScope.isNullOrEmpty(columnDef.ui.table) ? false : true;
                            }

                            columnDef.width = '*';
                            columnDef.minWidth = columnDef.ui.width || 100;
                            columnDef.enableColumnResizing = true;
                            columnDef.enableCellEdit = columnDef.ui.enableCellEdit;
                            columnDef.fieldType = columnDef.type;

                            if (columnDef.fieldType.toLowerCase() == 'date') {
                                columnDef.type = 'date';
                                columnDef.cellFilter = 'date:"yyyy-MM-dd"';
                                columnDef.cellClass = 'grid-align-center';
                                columnDef.editableCellTemplate = "<div timepicker><input datetime=\"yyyy-MM-dd\" ng-model=\"MODEL_COL_FIELD\"></div>";
                            } else if (columnDef.fieldType.toLowerCase() == 'datetime') {
                                columnDef.type = 'date';
                                columnDef.cellFilter = 'date:"yyyy-MM-dd HH:mm"';
                                columnDef.editableCellTemplate = "<div timepicker><input datetime=\"yyyy-MM-dd HH:mm\" ng-model=\"MODEL_COL_FIELD\"></div>";
                            } else if (columnDef.fieldType.toLowerCase() == 'time') {
                                columnDef.cellFilter = 'date:"HH:mm"';
                                columnDef.editableCellTemplate = "<div timepicker><input datetime=\"HH:mm\" ng-model=\"MODEL_COL_FIELD\"></div>";
                                columnDef.cellClass = 'grid-align-center';
                            } else if (columnDef.fieldType.toLowerCase() == 'integer') {
                                columnDef.type = 'number';
                                columnDef.cellClass = 'grid-align-right';
                            } else if (columnDef.fieldType.toLowerCase() == 'string') {
                                columnDef.type = 'text';
                                columnDef.cellClass = 'grid-align-left';
                            } else if (columnDef.fieldType.toLowerCase() == 'decimal') {
                                columnDef.cellClass = 'grid-align-right';
                            } else if (columnDef.fieldType.toLowerCase() == 'select') {

                                var optionsArray = [];
                                var options = columnDef.enum.list.split(";");
                                // store it in a map for later usage
                                $scope.optionsMap[columnDef.name] = options;
                                for (var i = 0; i < options.length; i++) {
                                    optionsArray.push({
                                        id: i,
                                        option: options[i]
                                    });
                                }
                                //todo/kn.. change this in the directive to control each cell by its own
                                //todo/kn.. for a better control get a better external component for the selects
                                if (columnDef.allowEmpty == false) {
                                    $('#mygrid.ui-grid-cell div select option:first-child[value=""]').css({
                                        display: "none"
                                    });
                                }
                                columnDef.cellClass = 'grid-align-center';
                                columnDef.editableCellTemplate = 'ui-grid/dropdownEditor';
                                columnDef.editDropdownIdLabel = 'option';
                                columnDef.editDropdownValueLabel = 'option';
                                columnDef.editDropdownOptionsArray = optionsArray;
                            } else if (!$rootScope.isNullOrEmpty(columnDef.relationship.relationshipType)
                                && $rootScope.isReferring(columnDef.relationship.relationshipType, columnDef.relationship.mappedBy)) {
                                columnDef.editableCellTemplate = "<div input-editor-wrapper><input bs-input=\"+row.entity\" bs-input-name=\"" + columnDef.name + "\" " +
                                    "bs-input-type=\"" + columnDef.type + "\" bs-input-value=\"{{MODEL_COL_FIELD}}\" ng-model=\"MODEL_COL_FIELD\"></div>";
                                columnDef.cellClass = 'grid-align-left';
                            }
                        });

                    });
                }
                $scope.getPage();

                /**
                 * just for the child tables
                 */
                if ($scope.parentName != null) {
                    /**
                     * for the current tab, if a parent is selected, load its data, otherwise empty the table
                     */
                    $scope.$watch('selectedParent', function (newVal, oldVal) {
                        if ($scope.active) {
                            if (newVal.id != null) {
                                $scope.getPage();
                            } else {
                                $scope.gridoptions.data = [];
                                $scope.gridApi.core.notifyDataChange(uiGridConstants.dataChange.ALL);
                            }
                        }
                    }, true);

                    /**
                     * if a new tab gets selected and a parent is selected
                     * and no data is loaded yet for the table in this new tab, load the data for this tab
                     */
                    $scope.$watch('active', function (newVal, oldVal) {
                        if (newVal) {
                            if (!$rootScope.isNullOrEmpty($scope.selectedParent) && $scope.selectedParent.id != null
                                && ($scope.gridoptions.data == null
                                || $scope.gridoptions.data.length == null
                                || $scope.gridoptions.data.length == 0)) {
                                $scope.getPage();
                            }
                        }
                    }, true);
                }

                $scope.rowSelectionChanged = function (row) {
                    if (row.isSelected) {
                        $scope.selected = row.entity;
                    } else {
                        $scope.selected = null;
                    }
                    /**
                     * if this is the parent table, set the id of the selected entity to the selectedParentId field
                     */
                    if ($scope.parentName == null) {
                        if (!$rootScope.isNullOrEmpty($scope.selected) && row.isSelected) {
                            $scope.selectedParent.id = $scope.selected.id;
                        } else {
                            $scope.selectedParent.id = null;
                        }
                    }
                    if (typeof $scope.preview === "function") {
                        $scope.preview($scope.selected, row.isSelected);
                    }
                }

                $scope.rowSelectionChangedBatch = function (rows) {
                    if (rows != null && rows.length > 0) {
                        $scope.rowSelectionChanged(rows[0]);
                    }
                }

                $scope.add = function () {

                    var parentName = null;
                    if ($scope.parentName != null) {
                        parentName = $scope.parentName;
                    }
                    var selectedParentId = (parentName != null && !$rootScope.isNullOrEmpty($scope.selectedParent)) ? $scope.selectedParent.id : null;
                    if (parentName != null && selectedParentId == null) {
                        alert("Please select a parent before adding a new " + $scope.modelName)
                        return
                    }

                    // if this is an one-to-many relationship and there is already an entry in this table, display an error
                    if (parentName != null
                        && selectedParentId != null
                        && $rootScope.isReferring($scope.parentType, $scope.parentRelationship.mappedBy)
                        && $scope.gridoptions.data.length == 1
                    ) {
                        alert("There is already one '" + $scope.modelName + "' assigned to the parent entity '" + parentName + "'")
                        return
                    }

                    $scope.selectedCopy = {};

                    /**
                     * if object has a parent, first get its value as-string before opening the dialog
                     */
                    if (selectedParentId != null) {
                        /**
                         * get the parent name first and then open the dialog
                         */
                        Action.execute('turboModel-asString', [
                            parentName,
                            $scope.selectedParent.id
                        ]).then(function (asString) {
                            $scope.parentAsString = asString;
                            console.log($scope.parentAsString)
                            $scope.dialog = ngDialog.open({
                                template: 'resource?directive=turboModel-addModal.html',
                                scope: $scope,
                                className: 'ngdialog-theme-default',
                                closeByDocument: false,
                                cache: false
                            });
                        });
                    }
                    /**
                     * if there is no parent exists, just open the dialog
                     */
                    else {
                        $scope.dialog = ngDialog.open({
                            template: 'resource?directive=turboModel-addModal.html',
                            scope: $scope,
                            className: 'ngdialog-theme-default',
                            closeByDocument: false,
                            cache: false
                        });
                    }

                }


                $scope.edit = function () {
                    if ($scope.selected == null || $scope.selected.id == null) {
                        alert("Select an entity first before editing!")
                        return
                    }
                    $scope.selectedCopy = $scope.selected;
                    $scope.dialog = ngDialog.open({
                        template: 'resource?directive=turboModel-addModal.html',
                        scope: $scope,
                        className: 'ngdialog-theme-default',
                        closeByDocument: false,
                        cache: false
                    });
                }

                $scope.persistEntity = function () {

                    var selectedParent = null;
                    if (!$rootScope.isNullOrEmpty($scope.selectedParent)) {
                        selectedParent = $scope.selectedParent.id;
                    }

                    var parentInfo = Objects.parentInfo($scope.parentFieldName,
                        $scope.parentName,
                        $scope.parentType,
                        $scope.parentRelationship,
                        selectedParent);

                    Action.execute('turboModel-saveUpdate', [
                        $scope.modelName,
                        $scope.$copyForTransfer($scope.selectedCopy),
                        $scope.selectedCopy.id,
                        parentInfo
                    ]).then(function (id) {
                        console.log(id);
                        if ($scope.selectedCopy.id) {
                            // update the entity in the grid
                            for (var i = 0; i < $scope.gridoptions.data.length; i++) {
                                var entity = $scope.gridoptions.data[i];
                                if (entity.id == $scope.selectedCopy.id) {
                                    $scope.gridoptions.data[i] = $scope.selectedCopy;
                                }
                            }
                        } else {
                            $scope.selectedCopy.id = id;
                            $scope.gridoptions.data.unshift($scope.selectedCopy);
                            $timeout(function () {
                                if ($scope.gridApi.selection.selectRow) {
                                    $scope.gridApi.selection.selectRow($scope.gridoptions.data[0]);
                                }
                            });
                        }
                        if (typeof $scope.preview === "function") {
                            $scope.preview($scope.selectedCopy, true);
                        }
                        if ($scope.dialog != null) {
                            $scope.dialog.close();
                        }
                    });

                };


                $scope.$copyForTransfer = function (object) {
                    var copy = {};
                    angular.forEach($scope.gridoptions.columnDefs, function (columnDef, index) {
                        if ($rootScope.isReferring(columnDef.relationship.relationshipType, columnDef.relationship.mappedBy)) {
                            copy[columnDef.name + "_$$id"] = object[columnDef.name + "_$$id"];
                            copy[columnDef.name + "_$$type"] = columnDef.fieldType;
                        } else {
                            copy[columnDef.name] = $scope.$Value(object[columnDef.name], columnDef.fieldType);
                        }
                    });
                    return copy;
                }

                $scope.close = function () {
                    if ($scope.dialog != null) {
                        $scope.dialog.close();
                    }
                };


            }
        }
    })

    .directive('bsInput', function (Action, ngDialog) {
        return {
            restrict: 'A',
            scope: {
                bsInput: '=',
                bsInputName: '@',
                bsInputType: '@',
                bsInputValue: '@'
            },
            link: function (scope, element, attrs) {

                scope.previousValue = null;
                scope.dialog = null;

                angular.element(element).bind("keydown keypress", function (event) {
                    if (event.which === 9) {
                        if (scope.previousValue == scope.bsInputValue) {
                            return
                        }
                        if (scope.bsInputType == null || scope.bsInputType == "") {
                            return;
                        }
                        scope.findRelationByKey(scope.bsInputType, scope.bsInputValue);
                    }
                });

                scope.findRelationByKey = function (type, value) {
                    Action.execute('turboModel-findRelationByKey', [type, value])
                        .then(function (result) {
                        if (result == null || result.length == 0) {
                            // bring up the dialog
                            scope.modelName = scope.bsInputType
                            scope.dialog = ngDialog.open({
                                template: 'resource?directive=turboModel-selectionModal.html',
                                scope: scope,
                                className: 'ngdialog-theme-default dialogwidth_80_60',
                                closeByDocument: false,
                                cache: false
                            });
                        } else {
                            scope.setSelectedObject(result[0])
                        }
                    });
                }

                scope.selectMethod = function (selectedObject) {
                    if (selectedObject == null) {
                        alert("Select an entity first before selecting!")
                        return
                    }
                    if (scope.dialog != null) {
                        scope.dialog.close()
                    }
                    scope.setSelectedObject(selectedObject)
                }

                scope.setSelectedObject = function (selectedObject) {
                    scope.bsInput[scope.bsInputName] = selectedObject['asString']
                    scope.previousValue = selectedObject['asString']
                    scope.bsInput[scope.bsInputName + "_$$id"] = selectedObject['id']
                    scope.bsInput[scope.bsInputName + "_$$editing"] = true
                    element[0].focus()
                }

            }
        }
    })


    .directive('inputEditorWrapper',
    ['gridUtil', 'uiGridConstants', 'uiGridEditConstants', '$timeout', 'uiGridEditService',
        function (gridUtil, uiGridConstants, uiGridEditConstants, $timeout, uiGridEditService) {
            return {
                require: ['?^uiGrid', '?^uiGridRenderContainer'],
                compile: function () {
                    return {
                        post: function ($scope, $elm, $attrs, controllers) {
                            var element = $elm[0].childNodes[0];
                            //set focus at start of edit
                            $scope.$on(uiGridEditConstants.events.BEGIN_CELL_EDIT, function (evt, triggerEvent) {
                                $timeout(function () {
                                    element.focus();
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


;



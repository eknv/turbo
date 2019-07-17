var app = angular.module('entityEditor',
    ['ngRoute', 'ui.grid', 'ui.grid.edit', 'ui.grid.cellNav', 'ui.grid.resizeColumns',
        'ui.grid.selection', 'ui.bootstrap', 'ngAnimate', 'ngMaterial', 'ngMessages',
        'ngLodash', 'ui.select']);


app.run(function ($rootScope, lodash) {
    $rootScope.addToFirstUnique = function (array1, array2) {
        var union = lodash.union(array1, array2);
        var xor = lodash.xor(array1, union);
        for (var i = 0; i < xor.length; i++) {
            array1.push(xor[i]);
        }
    }
});


app.config(function ($routeProvider) {

    $routeProvider
        .when('/', {
            templateUrl: 'client/client.html'
        })
        .when('/about', {
            templateUrl: 'client/about.html'
        });

});


app.controller('cfgController', function ($scope, uiGridConstants, ModalService, $timeout, $mdDialog, lodash) {

    $scope.resetCurrentModel = function () {
        $scope.currentModel = {name: '', version: '1', $key: '', fields: [], constraints: []};
    };

    $scope.createEmptyField = function () {
        var field = {name: '', type: '', nullable: true, length: ''};
        field.general = {generator: 'hilo', generatorName: 'timestampGenerator', maxLow: '32767', primaryKeyValue: 'hi_value'};
        field.ui = {table: true, width: '80', enableEdit: true, preview: true};
        field.search = {active: false, like: false, range: false};
        field.relationship = {
            relationshipType: '', mappedBy: '', referencedBy: '', cascade: 'All', orphanRemoval: true, orderBy: '',
            mapKey: '', eager: false, fetchMode: '', batchSize: '200'
        };
        return field;
    };

    $scope.createOptionsModel = function () {
        var options = {};
        options.nullable = {boolean: true};
        options.enableEdit = {boolean: true};
        options.preview = {boolean: true};
        options.active = {boolean: true};
        options.like = {boolean: true};
        options.range = {boolean: true};
        options.eager = {boolean: true};
        options.cascade = {boolean: true};
        options.generator = {list: ['hilo', 'auto', 'custom']};
        options.type = {list: ['']};
        options.primitiveType = {
            list: ['Integer', 'Decimal', 'DateTime', 'Date', 'Time', 'String', 'Boolean']
        };
        options.specialType = {
            list: ['Select', 'CreatedBy', 'CreatedDate', 'LastModifiedBy', 'LastModifiedDate', 'ID']
        };
        options.relationshipType = {list: ['', 'ManyToMany', 'OneToMany', 'ManyToOne', 'OneToOne', 'Set']};
        options.referencedBy = {list: ['']};
        options.mappedBy = {list: ['']};
        options.mapKey = {list: ['']};
        options.orderBy = {list: ['']};
        options.cascade = {list: ['None', 'All', 'Persist', 'Merge', 'Remove', 'Refresh', 'Detach']};
        options.fetchMode = {list: ['Select', 'SubSelect', 'Join']};
        options.table = {boolean: true};
        options.orphanRemoval = {boolean: true};
        options.eager = {boolean: true};
        return options;
    };

    $scope.props = {}
    $scope.models = [];
    $scope.currentModel = {}
    $scope.resetCurrentModel()
    $scope.currentField = $scope.createEmptyField();
    $scope.currentConstraint = {};
    $scope.options = $scope.createOptionsModel();

    $scope.loadModels = function () {
        $.get("/data",
            function (data, status) {
                if (status == "success") {
                    var result = angular.fromJson(data);
                    $scope.props = result.props;
                    $scope.$apply(function () {
                        for (var i = 0; i < result.models.length; i++) {
                            $scope.models.push(result.models[i]);
                        }
                    });
                    $scope.updateOptionsModel();
                    console.log("models have successfully been loaded!");
                } else {
                    console.log("there was a problem loading the models!");
                }
            });
    }
    $scope.loadModels();


    $scope.updateOptionsModel = function () {
        $scope.options.type.list.length = 0;
        for (var i = 0; i < $scope.options.primitiveType.list.length; i++) {
            $scope.options.type.list.push($scope.options.primitiveType.list[i]);
        }
        for (var i = 0; i < $scope.options.specialType.list.length; i++) {
            $scope.options.type.list.push($scope.options.specialType.list[i]);
        }
        for (var i = 0; i < $scope.models.length; i++) {
            $scope.options.type.list.push($scope.models[i].name);
        }
        if ($scope.fieldGridApi) {
            $scope.fieldGridApi.core.notifyDataChange(uiGridConstants.dataChange.ALL);
        }
    }

    $scope.addNewEntity = function () {
        var nextTempName = $scope.nextTempName($scope.models, "entity", "entity1");
        $scope.addEntity(nextTempName);
    }

    $scope.addEntity = function (entityName) {
        var validateEntity = $scope.validateEntity(entityName);
        if (validateEntity != null) {
            alert(validateEntity);
            return;
        }
        $scope.resetCurrentModel()
        $scope.currentModel.name = entityName;
        // at this model to the list of the models
        $scope.models.unshift($scope.currentModel);
        $scope.updateFieldGrid($scope.currentModel.fields);
        $scope.updateConstraintGrid($scope.currentModel.constraints);
        $scope.updateOptionsModel();
        $timeout(function () {
            $scope.modelGridApi.selection.selectRow($scope.currentModel);
        }, 100);
    }


    $scope.deleteEntity = function (ev) {

        var selectedRows = $scope.modelGridApi.selection.getSelectedRows();
        if (selectedRows == null || selectedRows.length == 0) {

            $mdDialog.show(
                $mdDialog.alert()
                    .parent(angular.element(document.querySelector('#popupContainer')))
                    .clickOutsideToClose(true)
                    .title('Alert')
                    .textContent('No entity is currently selected to be deleted')
                    .ariaLabel('Alert')
                    .ok('OK')
                    .targetEvent(ev)
            );
        } else {
            // Appending dialog to document.body to cover sidenav in docs app
            var confirm = $mdDialog.confirm()
                .title('Delete Confirmation')
                .textContent('Would you like to delete the selected entity?')
                .ariaLabel('Delete Confirmation')
                .targetEvent(ev)
                .ok('Delete')
                .cancel('Cancel');

            $mdDialog.show(confirm).then(function () {
                    var index = $scope.models.indexOf(selectedRows[0]);
                    $scope.models.splice(index, 1);
                    $scope.updateFieldGrid([]);
                    $scope.currentField = $scope.createEmptyField();
                    $scope.updateConstraintGrid([]);
                    $scope.currentConstraint = {};
                    $scope.updateOptionsModel();
                    $timeout(function () {
                        if (index >= 1) {
                            $scope.modelGridApi.selection.selectRow($scope.models[index - 1]);
                        } else if ($scope.models.length > 0) {
                            $scope.modelGridApi.selection.selectRow($scope.models[index]);
                        }
                    }, 50);
                }, function () {
                }
            );
        }
    }

    $scope.validateEntity = function (entityName) {
        if (entityName == null || entityName == "") {
            return "Entity name cannot be empty";
        }
        var arrayLength = $scope.models.length;
        for (var i = 0; i < arrayLength; i++) {
            if ($scope.models[i].name == entityName) {
                return "Another entity with the same name exist";
            }
        }
        return null;
    }


    $scope.saveModels = function () {
        $scope.updateEntitiesAndFields();
        var content = {}
        if ($scope.props.version) {
            $scope.props.version = $scope.props.version + 1
        } else {
            $scope.props.version = 1
        }
        content.props = $scope.props
        content.models = $scope.models
        var contentAsJson = angular.toJson(content);
        $.post("/data",
            {
                content: contentAsJson
            },
            function (data, status) {
                if (status == "success") {
                    console.log("models have successfully been stored!");
                } else {
                    console.log("there was a problem storing the models: " + data);
                }
            });
    }


    /**
     * if new entity or field properties are introduced or removed, update the existing entities and models
     */
    $scope.updateEntitiesAndFields = function () {
        for (var modelCounter = 0; modelCounter < $scope.models.length; modelCounter++) {
            var model = $scope.models[modelCounter];
            // if a field is missing in the existing models, add it to there
            for (var property in $scope.currentModel) {
                if (!model.hasOwnProperty(property)) {
                    if ($.isArray(property)) {
                        model[property] = []
                    } else {
                        model[property] = ""
                    }
                }
            }
            // if a field in the existing model does not exist any longer, remove it
            for (var property in model) {
                if (property != '$$hashKey' && !$scope.currentModel.hasOwnProperty(property)) {
                    delete model[property];
                }
            }

            for (var fieldCounter = 0; fieldCounter < model.fields.length; fieldCounter++) {
                var field = model.fields[fieldCounter];
                // if a field is missing in the existing fields, add it to there
                for (var property in $scope.currentField) {
                    if (!field.hasOwnProperty(property)) {
                        if ($.isArray($scope.currentField[property])) {
                            field[property] = []
                        } else if($scope.currentField[property] !== null
                            && typeof $scope.currentField[property] === 'object'){
                            field[property] = {}
                        } else {
                            field[property] = ""
                        }
                    }
                    // if the property is object, iterate over its fields
                    if($scope.currentField[property] !== null && typeof $scope.currentField[property] === 'object'){
                        for (var subProperty in $scope.currentField[property]) {
                            if (!field[property].hasOwnProperty(subProperty)) {
                                field[property][subProperty] = ""
                            }
                        }
                    }
                }
                // if a field in the existing fields does not exist any longer, remove it
                for (var property in field) {
                    if (property != '$$hashKey' && !$scope.currentField.hasOwnProperty(property)) {
                        delete field[property];
                    }
                    if($scope.currentField[property] !== null && typeof $scope.currentField[property] === 'object'){
                        for (var subProperty in field[property]) {
                            if (subProperty != '$$hashKey' && !$scope.currentField[property].hasOwnProperty(subProperty)) {
                                delete field[property][subProperty];
                            }
                        }
                    }
                }
            }
        }
    }


    $scope.modelGridOptions = {
        showColumnFooter: true,
        multiSelect: false,
        enableRowHeaderSelection: true,
        showSelectionCheckbox: true,
        selectionRowHeaderWidth: 30,
        columnDefs: [
            {name: 'name', aggregationType: uiGridConstants.aggregationTypes.count, width: 150},
            {
                name: 'version', width: 150, enableCellEdit: true,
                cellClass: function (grid, row, col, rowRenderIndex, colRenderIndex) {
                    if (grid.getCellValue(row, col) === 'male') {
                        return 'blue';
                    } else if (grid.getCellValue(row, col) === 'female') {
                        return 'pink';
                    }
                }
            },
            {name: '$key', width: 100}
        ],

        onRegisterApi: function (modelGridApi) {
            $scope.modelGridApi = modelGridApi;
            $scope.modelGridApi.edit.on.afterCellEdit($scope, function (rowEntity, colDef, newValue, oldValue) {
                if (oldValue == newValue) {
                    return;
                }
            });
            $scope.modelGridApi.selection.on.rowSelectionChanged($scope, $scope.modelGridRowSelectionChanged);
            $scope.modelGridApi.selection.on.rowSelectionChangedBatch($scope, $scope.modelGridRowSelectionChangedBatch);
            $scope.$on('ui.layout.resize', function (e, beforeContainer, afterContainer) {
                $scope.modelGridApi.core.handleWindowResize();
            });
        },

        data: $scope.models
    };

    $scope.modelGridRowSelectionChangedBatch = function (rows) {
        if (rows != null && rows.length > 0) {
            $scope.modelGridRowSelectionChanged(rows[0]);
        }
    }

    $scope.modelGridRowSelectionChanged = function (row) {
        $scope.currentModel = row.entity;
        $scope.changeCurrentField($scope.currentModel.fields[0]);
        $scope.updateFieldGrid($scope.currentModel.fields);
        $timeout(function () {
            $scope.fieldGridApi.selection.selectRow($scope.currentField);
        }, 100);
        $scope.changeCurrentConstraint($scope.currentModel.constraints[0]);
        $scope.updateConstraintGrid($scope.currentModel.constraints);
        $timeout(function () {
            $scope.constraintGridApi.selection.selectRow($scope.currentConstraint);
        }, 100);
    }


    /************************************************
     * Fields
     */

    $scope.fieldTypes = [];
    $scope.$watchCollection("options.type.list", function () {
        $scope.fieldTypes.length = 0;
        for (var i = 0; i < $scope.options.type.list.length; i++) {
            $scope.fieldTypes.push({
                id: i,
                option: $scope.options.type.list[i]
            });
        }
    });

    $scope.fieldGridOptions = {
        showColumnFooter: true,
        multiSelect: false,
        enableRowHeaderSelection: true,
        showSelectionCheckbox: true,
        selectionRowHeaderWidth: 30,
        columnDefs: [
            {
                name: 'name',
                aggregationType: uiGridConstants.aggregationTypes.count,
                width: 150,
                cellClass: function (grid, row, col, rowRenderIndex, colRenderIndex) {
                    if (grid.getCellValue(row, col) === 'male') {
                        return 'blue';
                    } else if (grid.getCellValue(row, col) === 'female') {
                        return 'pink';
                    }
                }
            },
            {
                name: 'type', width: 150, enableCellEdit: true,
                cellClass: 'grid-align-center',
                editableCellTemplate: 'ui-grid/dropdownEditor',
                editDropdownIdLabel: 'option',
                editDropdownValueLabel: 'option',
                editDropdownOptionsArray: $scope.fieldTypes
            },
            {name: 'nullable', width: 100, type: 'boolean'}
        ],

        onRegisterApi: function (fieldGridApi) {
            $scope.fieldGridApi = fieldGridApi;
            $scope.fieldGridApi.edit.on.afterCellEdit($scope, function (rowEntity, colDef, newValue, oldValue) {
                if (oldValue == newValue) {
                    return;
                }
            });
            $scope.fieldGridApi.selection.on.rowSelectionChanged($scope, $scope.fieldGridRowSelectionChanged);
            $scope.fieldGridApi.selection.on.rowSelectionChangedBatch($scope, $scope.fieldGridRowSelectionChangedBatch);
            $scope.$on('ui.layout.resize', function (e, beforeContainer, afterContainer) {
                $scope.fieldGridApi.core.handleWindowResize();
            });
        },

        data: $scope.currentModel.fields
    };

    $scope.addNewField = function () {
        var nextTempName = $scope.nextTempName($scope.currentModel.fields, "field", "field1");
        $scope.addField(nextTempName);
    }

    $scope.addField = function (fieldName) {
        var validateField = $scope.validateField(fieldName);
        if (validateField != null) {
            alert(validateField);
            return;
        }
        var field = $scope.createEmptyField();
        field.name = fieldName;
        $scope.changeCurrentField(field);
        $timeout(function () {
            $scope.currentModel.fields.unshift($scope.currentField);
            $timeout(function () {
                $scope.fieldGridApi.selection.selectRow($scope.currentField);
            }, 10);
        }, 50);
    }


    $scope.deleteField = function (ev) {

        var selectedRows = $scope.fieldGridApi.selection.getSelectedRows();
        if (selectedRows == null || selectedRows.length == 0) {

            $mdDialog.show(
                $mdDialog.alert()
                    .parent(angular.element(document.querySelector('#popupContainer')))
                    .clickOutsideToClose(true)
                    .title('Alert')
                    .textContent('No field is currently selected to be deleted')
                    .ariaLabel('Alert')
                    .ok('OK')
                    .targetEvent(ev)
            );
        } else {
            // Appending dialog to document.body to cover sidenav in docs app
            var confirm = $mdDialog.confirm()
                .title('Delete Confirmation')
                .textContent('Would you like to delete the selected field?')
                .ariaLabel('Delete Confirmation')
                .targetEvent(ev)
                .ok('Delete')
                .cancel('Cancel');

            $mdDialog.show(confirm).then(function () {
                    var index = $scope.currentModel.fields.indexOf(selectedRows[0]);
                    $scope.currentModel.fields.splice(index, 1);
                    $scope.currentField = $scope.createEmptyField();
                }, function () {
                }
            );
        }
    }


    $scope.nextTempName = function (array, fieldName, nextFieldName) {
        var currentSequenceNumber = 1;
        if (fieldName != nextFieldName) {
            currentSequenceNumber = lodash.parseInt(nextFieldName.substr(fieldName.length));
        }
        var arrayLength = array.length;
        for (var i = 0; i < arrayLength; i++) {
            if (array[i].name == nextFieldName) {
                return $scope.nextTempName(array, fieldName, fieldName + (currentSequenceNumber + 1));
            }
        }
        return nextFieldName;
    }


    $scope.validateField = function (fieldName) {
        if ($scope.currentModel == null || $scope.currentModel.name == "") {
            return "Please select an entity first!";
        }
        if (fieldName == null || fieldName == "") {
            return "Field name cannot be empty";
        }
        var arrayLength = $scope.currentModel.fields.length;
        for (var i = 0; i < arrayLength; i++) {
            if ($scope.currentModel.fields[i].name == fieldName) {
                return "Another field with the same name exist";
            }
        }
        return null;
    }

    $scope.fieldGridRowSelectionChangedBatch = function (rows) {
        if (rows != null && rows.length > 0) {
            $scope.fieldGridRowSelectionChanged(rows[0]);
        }
    }

    $scope.fieldGridRowSelectionChanged = function (row) {
        $scope.changeCurrentField(row.entity);
    }

    $scope.changeCurrentField = function (field) {
        // set the currentField to null first and then to the desired value in order to re-render the UI
        $scope.currentField = $scope.createEmptyField();
        $timeout(function () {
            $scope.currentField = field;
        }, 10);
    }

    $scope.updateFieldGrid = function (fields) {
        $scope.fieldGridOptions.data = fields;
        $scope.fieldGridApi.core.notifyDataChange(uiGridConstants.dataChange.ALL);
    }


    /************************************************
     * Constraints
     */

    $scope.constraintTypes = [{id: 0, option: 'Index'}, {id: 1, option: 'Unique'}];
    $scope.constraintGridOptions = {
        showColumnFooter: true,
        multiSelect: false,
        enableRowHeaderSelection: true,
        showSelectionCheckbox: true,
        selectionRowHeaderWidth: 30,
        rowHeight: 60,
        columnDefs: [
            {
                name: 'name',
                width: 100
            },
            {
                name: 'type', width: 150, enableCellEdit: true,
                cellClass: function (grid, row, col, rowRenderIndex, colRenderIndex) {
                    if (grid.getCellValue(row, col) === 'Index') {
                        return 'blue';
                    } else if (grid.getCellValue(row, col) === 'Unique') {
                        return 'red';
                    }
                },
                editableCellTemplate: 'ui-grid/dropdownEditor',
                editDropdownIdLabel: 'option',
                editDropdownValueLabel: 'option',
                editDropdownOptionsArray: $scope.constraintTypes
            },
            {
                name: 'fields',
                width: 400,
                editableCellTemplate: 'client/select2Template.html'
            }
        ],

        onRegisterApi: function (constraintGridApi) {
            $scope.constraintGridApi = constraintGridApi;
            $scope.constraintGridApi.edit.on.afterCellEdit($scope, function (rowEntity, colDef, newValue, oldValue) {
                if (oldValue == newValue) {
                    return;
                }
            });
            $scope.constraintGridApi.selection.on.rowSelectionChanged($scope, $scope.constraintGridRowSelectionChanged);
            $scope.constraintGridApi.selection.on.rowSelectionChangedBatch($scope, $scope.constraintGridRowSelectionChangedBatch);
            $scope.$on('ui.layout.resize', function (e, beforeContainer, afterContainer) {
                $scope.constraintGridApi.core.handleWindowResize();
            });
        },

        data: $scope.currentModel.constraints
    };

    $scope.createEmptyConstraint = function (entityName) {
        var constraint = {parent: entityName, name: '', type: '', fields: []};
        return constraint;
    };

    $scope.constraintGridRowSelectionChangedBatch = function (rows) {
        if (rows != null && rows.length > 0) {
            $scope.constraintGridRowSelectionChanged(rows[0]);
        }
    }

    $scope.constraintGridRowSelectionChanged = function (row) {
        $scope.changeCurrentConstraint(row.entity);
    }

    $scope.changeCurrentConstraint = function (constraint) {
        // set the currentConstraint to null first and then to the desired value in order to re-render the UI
        $scope.currentConstraint = {};
        $timeout(function () {
            $scope.currentConstraint = constraint;
        }, 10);
    }


    $scope.addNewConstraint = function () {
        var nextTempName = $scope.nextTempName($scope.currentModel.constraints, "constraint", "constraint1");
        $scope.addConstraint($scope.currentModel.name, nextTempName);
    }

    $scope.addConstraint = function (entityName, constraintName) {
        var validateConstraint = $scope.validateConstraint(constraintName);
        if (validateConstraint != null) {
            alert(validateConstraint);
            return;
        }
        var constraint = $scope.createEmptyConstraint(entityName);
        constraint.name = constraintName;
        $scope.changeCurrentConstraint(constraint);
        $timeout(function () {
            $scope.currentModel.constraints.unshift($scope.currentConstraint);
            $timeout(function () {
                $scope.constraintGridApi.selection.selectRow($scope.currentConstraint);
            }, 10);
        }, 50);
    }

    $scope.validateConstraint = function (constraintName) {
        if ($scope.currentModel == null || $scope.currentModel.name == "") {
            return "Please select an entity first!";
        }
        if (constraintName == null || constraintName == "") {
            return "Constraint name cannot be empty";
        }

        var arrayLength;
        if ($scope.currentModel.constraints) {
            arrayLength = $scope.currentModel.constraints.length;
        } else {
            $scope.currentModel.constraints = [];
            return null;
        }

        for (var i = 0; i < arrayLength; i++) {
            if ($scope.currentModel.constraints[i].name == constraintName) {
                return "Another constraint with the same name exist";
            }
        }
        return null;
    }

    $scope.deleteConstraint = function (ev) {

        var selectedRows = $scope.constraintGridApi.selection.getSelectedRows();
        if (selectedRows == null || selectedRows.length == 0) {

            $mdDialog.show(
                $mdDialog.alert()
                    .parent(angular.element(document.querySelector('#popupContainer')))
                    .clickOutsideToClose(true)
                    .title('Alert')
                    .textContent('No constraint is currently selected to be deleted')
                    .ariaLabel('Alert')
                    .ok('OK')
                    .targetEvent(ev)
            );
        } else {
            // Appending dialog to document.body to cover sidenav in docs app
            var confirm = $mdDialog.confirm()
                .title('Delete Confirmation')
                .textContent('Would you like to delete the selected constraint?')
                .ariaLabel('Delete Confirmation')
                .targetEvent(ev)
                .ok('Delete')
                .cancel('Cancel');

            $mdDialog.show(confirm).then(function () {
                    var index = $scope.currentModel.constraints.indexOf(selectedRows[0]);
                    $scope.currentModel.constraints.splice(index, 1);
                    $scope.currentConstraint = {};
                }, function () {
                }
            );
        }
    }

    $scope.updateConstraintGrid = function (constraints) {
        $scope.constraintGridOptions.data = constraints;
        $scope.constraintGridApi.core.notifyDataChange(uiGridConstants.dataChange.ALL);
    }


});


app.directive('ngEnter', function () {
        return function (scope, element, attrs) {
            element.bind("keydown keypress", function (event) {
                if (event.which === 13) {
                    scope.$apply(function () {
                        scope.$eval(attrs.ngEnter, {'event': event});
                    });

                    event.preventDefault();
                }
            });
        };
    })

    // http://stackoverflow.com/questions/14833326/how-to-set-focus-on-input-field
    .directive('autoFocus', function ($timeout, $parse) {
        return {
            //scope: true,   // optionally create a child scope
            link: function (scope, element, attrs) {
                var autoFocusModel = $parse(attrs.autoFocus);
                scope.$watch(autoFocusModel, function (value) {
                    if (value === true) {
                        $timeout(function () {
                            element[0].focus();
                        });
                    }
                });
            }
        };
    })


    .directive('select2Wrapper',
        ['gridUtil', 'uiGridConstants', 'uiGridEditConstants', '$timeout', 'uiGridEditService',
            function (gridUtil, uiGridConstants, uiGridEditConstants, $timeout, uiGridEditService) {
                return {
                    require: ['?^uiGrid', '?^uiGridRenderContainer'],

                    compile: function () {
                        return {
                            post: function ($scope, $elm, $attrs, controllers) {

                                $scope.availableFields = [];
                                for (var i = 0; i < $scope.grid.appScope.currentModel.fields.length; i++) {
                                    $scope.availableFields.push($scope.grid.appScope.currentModel.fields[i].name);
                                }

                                /**
                                 * event handling
                                 */
                                var element = $elm[0].childNodes[1];
                                $scope.stopEdit = function (evt) {
                                    $scope.$emit(uiGridEditConstants.events.END_CELL_EDIT);
                                };
                                //set focus at start of edit
                                $scope.$on(uiGridEditConstants.events.BEGIN_CELL_EDIT, function (evt, triggerEvent) {
                                    $timeout(function () {
                                        element.focus();
                                    });
                                    angular.element($elm[0]).bind("keydown keypress", function (event) {
                                        if (event.which === 9) {
                                            event.preventDefault();
                                            $scope.stopEdit(event);
                                        }
                                    });
                                });

                            }
                        };
                    }

                };
            }])


;





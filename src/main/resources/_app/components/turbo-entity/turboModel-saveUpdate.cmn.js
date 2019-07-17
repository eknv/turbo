/**
 * todo/kn this action is not tested properly, it needs couple of test cases to test every aspect of it
 * @param modelName the entity name
 * @param entity object to be updated
 * @param rowId the object id
 * @param parentInfo info about the parent of the object
 * @returns the object id
 */
var execute = function (modelName, entity, rowId, parentInfo) {

    var self = this;
    var modelDetails = TM.modelDetails(modelName);
    var fieldList = modelDetails['fields'];

    /**
     * in case of insert
     */
    var allPromises = [];
    var object = null;
    if (G.isNullEmpty(rowId)) {
        object = {};
        G.toArray(fieldList).forEach(function (field) {
            var modelAlias = field["modelAlias"];
            if (G.isNullEmpty(modelAlias)) {
                modelAlias = "_this";
            }
            var prms = pUpdateRelatedObjects(entity, object, field, modelAlias);
            allPromises.push(prms);
        })
    }

    /**
     * in case of update
     */
    else {

        var loadPromise = DB.load(modelName, null, rowId)
            .then(function (obj) {
                object = obj;
                G.toArray(fieldList).forEach(function (field) {
                    var fieldName = field["name"];
                    if ("id" == fieldName) {
                        return;
                    }
                    var modelAlias = field["modelAlias"];
                    if (G.isNullEmpty(modelAlias)) {
                        modelAlias = "_this";
                    }
                    var prms = pUpdateRelatedObjects(entity, object, field, modelAlias)
                    allPromises.push(prms);
                })

            });
        allPromises.push(loadPromise);
    }

    /**
     * in case this object has a parent, load the the parent by its id and assign it to this object
     */
    if (!G.isNullEmpty(parentInfo)) {
        /**
         * in case of many-to-one relation from parent to child, update the respective parent field
         */
        if (TM.isReferring(parentInfo.parentRelationshipType, parentInfo.mappedBy)) {
            var loadPromise = DB.load(parentInfo.parentName, null, parentInfo.selectedParentId)
                .then(function (parentObjects) {
                    var parentObject = parentObjects[0];
                    /**
                     * if the parent-field-name is not given, use the parent-table-name instead
                     */
                    if (G.isNullEmpty(parentInfo.parentFieldName)) {
                        parentInfo.parentFieldName = S.uncapitalize(parentInfo.parentName);
                    }
                    var fieldNameOnParentObject = _referencedBy(modelDetails, parentInfo.parentFieldName);
                    parentObject[fieldNameOnParentObject] = object;
                    var _savePromise = DB.saveOrUpdate(parentInfo.parentFieldName, null, parentObject);
                    allPromises.push(_savePromise)
                })
            allPromises.push(loadPromise);
        }

        /**
         * in case of one-to-many, add the references on child side
         */
        else if (parentInfo.parentRelationshipType == "onetomany") {
            var loadPromise = DB.load(parentInfo.parentName, null, parentInfo.selectedParentId)
                .then(function (parentObjects) {
                    var parentObject = parentObjects[0];
                    /**
                     * if the parent-field-name is not given, use the parent-table-name instead
                     */
                    if (G.isNullEmpty(parentInfo.parentFieldName)) {
                        parentInfo.parentFieldName = S.uncapitalize(parentInfo.parentName);
                    }
                    object[parentInfo.parentFieldName] = parentObject;
                });
            allPromises.push(loadPromise);
        }

        /**
         * in case of many-to-many, add the references on both sides
         */
        else if (!G.isNullEmpty(parentInfo.parentRelationshipType) && parentInfo.parentRelationshipType.toLowerCase() == "manytomany") {
            var parentClass = C.DBC.getClassLoader().loadClass("turbo." + parentInfo.parentName);
            var parentObject = session.load(parentClass, G.int(parentInfo.selectedParentId));

            var loadPromise = DB.load(parentInfo.parentName, null, parentInfo.selectedParentId)
                .then(function (parentObjects) {
                    var parentObject = parentObjects[0];
                    /**
                     * if the parent-field-name is not given, use the parent-table-name instead
                     */
                    if (G.isNullEmpty(parentInfo.parentFieldName)) {
                        parentInfo.parentFieldName = S.uncapitalize(parentInfo.parentName);
                    }
                    if (G.isNullEmpty(object[parentInfo.parentFieldName])) {
                        //object[parentInfo.parentFieldName] = new C.HashSet();
                        object[parentInfo.parentFieldName] = []; //todo/kn needs testing
                    }
                    object[parentInfo.parentFieldName].push(parentObject);
                    var fieldNameOnParentObject = _referencedBy(modelDetails, parentInfo.parentFieldName);
                    //parentObject[fieldNameOnParentObject].add(object);
                    parentObject[fieldNameOnParentObject].add(object); //todo/in.. needs testing
                    var _savePromise = DB.saveOrUpdate(parentInfo.parentFieldName, null, parentObject);
                    allPromises.push(_savePromise)
                });
            allPromises.push(loadPromise);
        }
    }

    return Q.all(allPromises)
        .then(function (results) {
            DB.saveOrUpdate(modelName, null, object)
                .then(function (object) {
                    self.resolve(object);
                });
        });
}


var pUpdateRelatedObjects = function (entity, object, field, modelAlias) {

    var deferred = Q.defer();

    try {
        var fieldName = field.name;
        var fieldAliasName = modelAlias + '_' + fieldName;
        var fieldType = field.props.type;

        /**
         * many-to-one relationship
         */
        if (!G.isNullEmpty(entity[fieldName + "_$$id"])) {
            var relatedObjectId = entity[fieldName + "_$$id"]
            var relatedObjectType = entity[fieldName + "_$$type"];
            DB.load(relatedObjectType, null, relatedObjectId)
                .then(function (relatedObject) {
                    object[fieldName] = relatedObject;
                    deferred.resolve(object)
                })
                .fail(function (error) {
                    deferred.reject(error)
                })
        }
        /**
         * primitive fields
         */
        else {
            object[fieldName] = DB.convertType(fieldType, entity[fieldAliasName]);
            deferred.resolve(object)
        }
    } catch (e) {
        deferred.reject(e)
    }

    return deferred.promise;
}


var _referencedBy = function (modelDetails, fieldName) {
    var fieldList = modelDetails['fields'];
    var referencedBy = null;
    G.toArray(fieldList).forEach(function (field) {
        if (field[name] == fieldName) {
            referencedBy = field.props.rel_referencedBy;
        }
    })
    return referencedBy;
}

/**
 * TM: Turbo Model
 */
var TM = {

    /**
     * todo/kn continue refactoring, using jscript code instead of java wherever possible
     * add assert for the codes that should run just on server side
     */
    KEY_PATTERN: C == null ? null : C.Pattern.compile("\\$\\{[\\w]+\\}"),

    /**
     *
     * @param model
     */
    modelDetails: function (model) {
        return this.modelDetails(model, false);
    },


    /**
     * return the model-details for the given model
     * @param model
     * @param reload
     */
    modelDetails: function (entityName, reload) {
        var self = this;
        var entity = $$.globalCache.entitiesByName[entityName.toLowerCase()];
        assert.isTrue(entity != null, "No entity could be found by the name: " + entityName)
        entity.keys = self.$keys(reload);
        return entity;
    },

    fieldValue: function (item, fieldName) {
        var modelAlias = !G.isNullEmpty(item.modelAlias) ? item.modelAlias : "_this";
        return item[modelAlias + "_" + fieldName];
    },

    aliasedFieldName: function (field) {
        var modelAlias = !G.isNullEmpty(field.modelAlias) ? field.modelAlias : "_this";
        return modelAlias + "_" + field.name;
    },

    /**
     * find a model by its name
     * @param name
     * @returns a model
     */
    byName: function (name) {
        var self = this;
        if (name == null || $$.globalCache.entitiesByName == null) {
            return null;
        }
        var matchedEntity = null;
        _.forOwn($$.globalCache.entitiesByName, function (entity, entityName) {
            if (entityName == '_initialized') {
                return;
            }
            if (name.toLowerCase().equals(entityName.toLowerCase())) {
                matchedEntity = entity;
            }
        });
        return matchedEntity;
    },


    /**
     * @returns a map of the model names to the respective keys
     */
    modelKeys: {
        _initialized: false
    },


    $keys: function (reload) {
        var self = this;
        if (self.modelKeys._initialized == true || !reload) {
            return self.modelKeys;
        }
        if ($$.globalCache.entitiesByName == null) {
            return null;
        }
        _.forOwn($$.globalCache.entitiesByName, function (entity, entityName) {
            if (entityName == '_initialized') {
                return;
            }
            self.modelKeys[entity.name.toLowerCase()] = entity.key;
        });
        self.modelKeys._initialized = true;
        return self.modelKeys;
    },


    fieldsAsQueryString: function (fieldList, selectedFields, leftJoinFields) {

        var fieldsString = new C.StringBuilder()
        for (var itr = fieldList.iterator(); itr.hasNext();) {
            var field = itr.next();
            var modelAlias = field.get("modelAlias");
            if (G.isNullEmpty(modelAlias)) {
                modelAlias = "_this";
            }
            var fieldName = field.get("name");
            var relationshipType = field.props.rel_type;
            if (fieldName == null && relationshipType != null) {
                fieldName = relationshipType;
            }

            /**
             * in case of manytoone/onetoone, add the field to the left-join-fields
             */
            if (relationshipType != null
                && (relationshipType.toLowerCase() == 'manytoone' || relationshipType.toLowerCase() == 'onetoone')
                && leftJoinFields != null) {
                leftJoinFields.add(field)
                continue;
            }
            /**
             * in case of onetomany or manytomany ignore the field
             */
            if (relationshipType != null
                && (relationshipType.toLowerCase() == 'onetomany' || relationshipType.toLowerCase() == 'manytomany')) {
                continue;
            }
            /**
             * if the field is used add it to the list of selected fields
             */
            if (selectedFields != null) {
                selectedFields.add(field);
            }

            fieldsString.append(modelAlias).append(".").append(fieldName)
                .append(SPACE).append("as").append(SPACE).append(modelAlias).append("_").append(fieldName);
            if (itr.hasNext()
                && fieldsString.length() > 0
                && !fieldsString.substring(fieldsString.length() - 1).equals(COMMA)) {
                fieldsString.append(COMMA);
            }
            fieldsString.append(SPACE);
        }

        var length = fieldsString.length().intValue();
        if (fieldsString.substring(length - 2, length - 1).equals(COMMA)) {
            fieldsString = fieldsString.replace(length - 2, length - 1, "");
        }

        return fieldsString.toString();


        /*

         var fieldsString = '';

         fieldList.forEach(function (field, index) {

         var modelAlias = field[modelAlias];
         if (G.isNullEmpty(modelAlias)) {
         modelAlias = "_this";
         }
         var fieldName = field.get("name");
         var relationshipType = field.props.rel_type;
         if (fieldName == null && relationshipType != null) {
         fieldName = relationshipType;
         }

         /!**
         * in case of manytoone/onetoone, add the field to the left-join-fields
         *!/
         if (relationshipType != null
         && (relationshipType.toLowerCase() == 'manytoone' || relationshipType.toLowerCase() == 'onetoone')
         && leftJoinFields != null) {
         leftJoinFields.push(field)
         return;
         }

         /!**
         * in case of onetomany or manytomany ignore the field
         *!/
         if (relationshipType != null
         && (relationshipType.toLowerCase() == 'onetomany' || relationshipType.toLowerCase() == 'manytomany')) {
         return;
         }

         /!**
         * if the field is used add it to the list of selected fields
         *!/
         if (selectedFields != null) {
         selectedFields.push(field);
         }

         fieldsString += modelAlias + '.' + fieldName + ' as ' + modelAlias + '_' + fieldName;

         if (index != fieldList.length - 1
         && fieldsString != ''
         && fieldsString.slice(-1) != ',') {
         fieldsString += ',';
         }
         fieldsString += ' ';
         })

         if (fieldsString.slice(-2) == ', ') {
         fieldsString = fieldsString.substring(0, fieldsString.length - 2);
         }
         */


    },


    /**
     * return a map from the field names to the respective fields
     * @param fieldList
     */
    fieldByNameMap: function (fieldList) {
        var fieldByNameMap = {};
        G.toArray(fieldList).forEach(function (field) {
            fieldByNameMap[field.name] = field;
        })
        return fieldByNameMap;
    },


    fieldByName: function (entityName, fieldName) {
        var entity = TM.modelDetails(entityName);
        if (G.isNullEmpty(entity.fields)) {
            return null;
        }
        return _.find(entity.fields, function (field) {
            return field.name == fieldName;
        });
    },

    //todo/kn.. try just to use jscript code
    retrieveCriteriaFields: function (key) {
        if (key == null || key.trim().equals("")) {
            return null;
        } else {
            var fields = new C.HashSet();
            var matcher = this.KEY_PATTERN.matcher(key);
            var matches = new C.ArrayList();
            while (matcher.find()) {
                var element = matcher.group();
                matches.add(element);
            }
            if (!G.isNullEmpty(matches)) {
                matches.forEach(function (match) {
                    fields.add(match.replace("${", "").replace("}", ""));
                })
            }
            return new C.ArrayList(fields);
        }
    },


    asString: function (key, type, object) {
        if (object == null) {
            return null;
        }

        /**
         * if it does not exist, get the ID
         */
        if (key == null || key.trim().equals("")) {
            if (object.id != null) {
                return type + "(" + object.id + ")";
            } else {
                return object.toString();
            }
        }
        /**
         * otherwise get the fields and then replace fields with their values in the string
         */
        else {
            fields = this.retrieveCriteriaFields(key);
            var newKey = key;
            if (!G.isNullEmpty(fields)) {
                fields.forEach(function (field) {
                    newKey = newKey.replace("${" + field + "}", object[field]);
                })
            }
            return newKey;
        }
    },

    /**
     * @param relationshipType
     * @param mappedBy
     * @returns {boolean} whether this side of the relatioship is the referring side
     */
    isReferring: function (relationshipType, mappedBy) {
        return !G.isNullEmpty(relationshipType)
            && (relationshipType.toLowerCase() == 'manytoone' ||
            (relationshipType.toLowerCase() == 'onetoone' && G.isNullEmpty(mappedBy)));
    },


    asLongArray: function (intArray) {
        assert.isNotNull(intArray, "intArray cannot be null");
        var longArray = new C.ArrayList();
        intArray.forEach(function (intValue) {
            console.log(intValue)
            longArray.add(C.Long.valueOf(intValue))
        })
        return longArray;
    },

    /**
     * @param columnType
     */
    isPrimitiveType: function (columnType) {
        //console.log(assert)
        assert.isNotNull(columnType, "columnType should not be null");
        if (columnType == 'DateTime'
            || columnType == 'Date'
            || columnType == 'Time'
            || columnType == 'Decimal'
            || columnType == 'Integer'
            || columnType == 'String'
            || columnType == 'Boolean') {
            return true;
        }
        return false;
    }

}


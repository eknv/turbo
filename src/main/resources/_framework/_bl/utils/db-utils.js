var DB = {

    resultAsMap: function (modelName, selectedFields, leftJoinFields, rows, key) {

        var resultAsMap = new C.ArrayList()
        for (var j = 0; j < rows.length; j++) {
            var row = rows[j];
            var objectMap = new C.HashMap()
            /**
             * first the selected fields
             */
            for (var i = 0; i < selectedFields.length; i++) {
                var selectedField = selectedFields[i];
                var modelAlias = selectedField["modelAlias"];
                if (G.isNullEmpty(modelAlias)) {
                    modelAlias = "_this";
                }
                var key = modelAlias + "_" + selectedField["name"];
                var value = row[key];
                objectMap.put(key, value)
            }

            /**
             * then left-join fields
             */
            for (var i = 0; i < leftJoinFields.length; i++) {
                var leftJoinField = leftJoinFields[i];
                var leftJoinFieldName = leftJoinField["name"]
                /*todo/kn.. this logic needs to be checked explicitly after the refactoring*/
                // var selectedFieldValue = row["" + i++]
                var selectedFieldValue = row[leftJoinFieldName]
                if (selectedFieldValue != null) {
                    var leftJoinFieldType = leftJoinField["type"]
                    var relationshipModelDetails = TM.modelDetails(leftJoinFieldType)
                    var relationShipKey = relationshipModelDetails.key
                    var relationShipAsString = TM.asString(relationShipKey, leftJoinFieldType, selectedFieldValue)
                    objectMap.put(leftJoinFieldName, relationShipAsString)
                    objectMap.put(leftJoinFieldName + "_$$id", selectedFieldValue["id"])
                    objectMap.put(leftJoinFieldName + "_$$type", leftJoinFieldType)
                }
            }

            var asString = TM.asString(key, modelName, objectMap)
            objectMap.put("asString", asString)

            resultAsMap.add(objectMap)
        }

        return resultAsMap
    },


    prepareWhereClauseObject: function (whereClause) {
        var self = this;
        // comment in in order to see the where clause statements
        // console.log(whereClause)

        // if there is no parenthesis, just return
        if (whereClause.indexOf("(") != -1) {
            var parenthesisSections = XRegExp.matchRecursive(whereClause, '\\(', '\\)', 'g', {valueNames: ['between', 'left', 'match', 'right']});

            if (!G.isNullEmpty(parenthesisSections)) {
                var betweenSections = [];
                var matchSections = [];
                var addingParenthesisRequired = false;

                parenthesisSections.every(function (section, index) {
                    if (section.name == 'between') {
                        var sectionValue = $stu(section.value);
                        if (sectionValue != "AND" && sectionValue != "OR") {
                            addingParenthesisRequired = true;
                            return false;
                        }
                        if (!_.includes(betweenSections, sectionValue)) {
                            betweenSections.push(sectionValue);
                        }
                    } else if (section.name == 'match') {
                        matchSections.push(section.value);
                    }
                    return true;
                    //console.log(section);
                })

                // if not all necessary parenthesis are added to the block
                if (addingParenthesisRequired) {
                    var whereClauseWithPlaceholders = self.placeholderParenthesis(parenthesisSections);
                    var newWhereClause = self.addParenthesisToStatement(whereClauseWithPlaceholders.whereClause);
                    newWhereClause = _.replace(newWhereClause, /\((\s)*/g, "\(");
                    newWhereClause = _.replace(newWhereClause, /(\s)*\)/g, "\)");
                    _.forOwn(whereClauseWithPlaceholders.matches, function (value, placeHolder) {
                        newWhereClause = newWhereClause.replace("(" + placeHolder + ")", value);
                        newWhereClause = newWhereClause.replace(placeHolder, value);
                    });
                    return self.prepareWhereClauseObject(newWhereClause);
                }
                // if there is a mix of OR/AND combinations, add parenthesis to the where-clause
                else if (betweenSections.length == 2) {
                    return self.prepareWhereClauseObject(self.addParenthesisToSections(parenthesisSections));
                }
                else if (betweenSections.length == 0 && matchSections.length == 1) {
                    return self.prepareWhereClauseObject(matchSections[0]);
                }

                var sections = [];
                matchSections.forEach(function (matchSection) {
                    sections.push(self.prepareWhereClauseObject(matchSection))
                });

                return {
                    fnc: $stu(betweenSections[0]),
                    sections: sections
                }
            }
        } else {
            var connectedByAND = whereClause.match(/and /i);
            var connectedByOR = whereClause.match(/or /i);
            if (connectedByAND && connectedByOR) {
                var newWhereClause = self.addParenthesisToStatement(whereClause);
                return self.prepareWhereClauseObject(newWhereClause);
            } else if (connectedByAND) {
                var andConnectedSections = whereClause.split(/and /i);
                var andConnectedObjects = [];
                andConnectedSections.forEach(function (andConnectedSection) {
                    andConnectedObjects.push(self.statementObject(andConnectedSection));
                })
                return {
                    fnc: "AND",
                    sections: andConnectedObjects
                }
            } else if (connectedByOR) {
                var orConnectedSections = whereClause.split(/or /i);
                var orConnectedObjects = [];
                orConnectedSections.forEach(function (orConnectedSection) {
                    orConnectedObjects.push(self.statementObject(orConnectedSection));
                })
                return {
                    fnc: "OR",
                    sections: orConnectedObjects
                }
            } else {
                return self.statementObject(whereClause);
            }
        }
    },


    $alias4Entity: function (aliases, entity) {
        var alias = null;
        var result = _.pickBy(aliases, function (value, key) {
            if (value == entity) {
                alias = key;
            }
            return value == entity;
        });
        return alias;
    },


    retrieveJoinDetails: function (joinExpression) {
        var joinSection;
        var joinType;
        joinExpression = $st(joinExpression);
        if (joinExpression.indexOf(":") != -1) {
            var metaData = joinExpression.split(":");
            joinType = $st(metaData[0]);
            joinSection = $st(metaData[1]);
        } else {
            joinSection = $st(joinExpression);
            joinType = "inner";
        }

        assert.isTrue(joinType == 'inner' || joinType == 'outer', "Invalid join type: " + joinType);

        if (joinSection.indexOf("=") == -1) {
            throw new Error("Syntax Error, joinSection should have the format entity1.field1=entity2.field2")
        }

        var entitySplit = joinSection.split("=");
        var entityField1 = $st(entitySplit[0]);
        var entityField2 = $st(entitySplit[1]);

        if (entityField1.indexOf(".") == -1 && entityField2.indexOf(".") == -1) {
            if (entityField1.indexOf(".") == -1) {
                throw new Error("Syntax Error, entityField1 should have the format entity1.field1")
            }
            if (entityField2.indexOf(".") == -1) {
                throw new Error("Syntax Error, entityField2 should have the format entity2.field2")
            }
        }

        var entityField1_array = entityField1.split(".");
        var entityField2_array = entityField2.split(".");

        var entity1 = $st(entityField1_array[0]);
        var field1 = entityField1_array.length > 1 ? $st(entityField1_array[1]) : 'id';
        var entity2 = $st(entityField2_array[0]);
        var field2 = entityField2_array.length > 1 ? $st(entityField2_array[1]) : 'id';

        return {
            type: joinType,
            entity1: entity1,
            field1: field1,
            entity2: entity2,
            field2: field2
        }
    },


    addParenthesisToSections: function (parenthesisSections) {
        var whereClause = "(";
        parenthesisSections.forEach(function (section) {
            if (section.name == 'between' && $stu(section.value) == 'OR') {
                whereClause += ")";
            }
            whereClause += section.value;
            if (section.name == 'between' && $stu(section.value) == 'OR') {
                whereClause += "(";
            }
        })
        whereClause += ")";
        return whereClause;
    },


    addParenthesisToStatement: function (whereClause) {
        var connectedByAND = $stu(whereClause).indexOf("AND ") != -1;
        var connectedByOR = $stu(whereClause).indexOf("OR ") != -1;
        var connectedSections;
        var connector;
        if (connectedByAND && connectedByOR || connectedByOR) {
            connectedSections = whereClause.split(/or /i);
            connector = " OR (";
        } else {
            connectedSections = whereClause.split(/and /i);
            connector = " AND (";
        }
        var newWhereClause = "(";
        for (var i = 0; i < connectedSections.length; i++) {
            newWhereClause += connectedSections[i] + ")";
            if (i != connectedSections.length - 1) {
                newWhereClause += connector;
            }
        }
        return newWhereClause;
    },


    placeholderParenthesis: function (parenthesisSections) {
        var whereClause = '';
        var matches = {};
        var matchNumber = 1;
        parenthesisSections.forEach(function (section) {
            if (matches["match" + matchNumber] == null) {
                matches["match" + matchNumber] = '';
            }
            if (section.name == 'between') {
                whereClause += " " + section.value + " ";
            } else {
                matches["match" + matchNumber] += section.value;
            }
            if (section.name == 'right') {
                whereClause += "match" + matchNumber;
                matchNumber++;
            }
        })
        return {
            whereClause: whereClause,
            matches: matches
        }
    },


    statementObject: function (statement) {
        var statement = _.replace(statement, / +/g, " ");

        var negated = false;
        if (statement.match(/NOT /i)) {
            negated = true;
            statement = _.replace(statement, /NOT /i, "");
        }

        var statementObject;
        if (statement.match(/<>/i)) {
            var sections = $st(statement).split("<>");
            if (sections.length != 2) {
                throw new Error("Invalid SQL Statement");
            }
            statementObject = {
                fieldName: $st(sections[0]),
                sign: this.signConverter ? this.signConverter("neq") : "neq",
                valueName: $st(sections[1])
            }
        } else if (statement.match(/<=/i)) {
            var sections = $st(statement).split("<=");
            if (sections.length != 2) {
                throw new Error("Invalid SQL Statement");
            }
            statementObject = {
                fieldName: $st(sections[0]),
                sign: this.signConverter ? this.signConverter("lte") : "lte",
                valueName: $st(sections[1])
            }
        } else if (statement.match(/>=/i)) {
            var sections = $st(statement).split(">=");
            if (sections.length != 2) {
                throw new Error("Invalid SQL Statement");
            }
            statementObject = {
                fieldName: $st(sections[0]),
                sign: this.signConverter ? this.signConverter("gte") : "gte",
                valueName: $st(sections[1])
            }
        } else if (statement.match(/ SIMILAR /i)) {
            var sections = $st(statement).split(/ SIMILAR /i);
            if (sections.length != 2) {
                throw new Error("Invalid SQL Statement");
            }
            statementObject = {
                fieldName: $st(sections[0]),
                sign: this.signConverter ? this.signConverter("match") : "match",
                valueName: $st(sections[1])
            }
        } else if (statement.match(/ BETWEEN /i)) {
            var sections = statement.split(" ");
            if (sections.length != 5) {
                throw new Error("Invalid SQL Statement");
            }
            statementObject = {
                fieldName: sections[0],
                sign: this.signConverter ? this.signConverter("between") : "between",
                valueName: sections[2],
                valueName2: sections[4]
            }
        } else if (statement.match(/ IN /i)) {
            var sections = $st(statement).split(/ IN /i);
            if (sections.length != 2) {
                throw new Error("Invalid SQL Statement");
            }
            statementObject = {
                fieldName: $st(sections[0]),
                sign: this.signConverter ? this.signConverter("in") : "in",
                valueName: $st(sections[1])
            }
        } else if (statement.match(/ IS NULL/i)) {
            var sections = $st(statement).split(/ IS NULL/i);
            if (sections.length != 2) {
                throw new Error("Invalid SQL Statement");
            }
            statementObject = {
                fieldName: $st(sections[0]),
                sign: this.signConverter ? this.signConverter("is null") : "is null"
            }
        } else if (statement.match(/ IS NOT NULL/i)) {
            var sections = $st(statement).split(/ IS NOT NULL/i);
            if (sections.length != 2) {
                throw new Error("Invalid SQL Statement");
            }
            statementObject = {
                fieldName: $st(sections[0]),
                sign: this.signConverter ? this.signConverter("is not null") : "is not null"
            }
        } else if (statement.match(/=/i)) {
            var sections = $st(statement).split(/=/i);
            if (sections.length != 2) {
                throw new Error("Invalid SQL Statement");
            }
            statementObject = {
                fieldName: $st(sections[0]),
                sign: this.signConverter ? this.signConverter("eq") : "eq",
                valueName: $st(sections[1])
            }
        } else if (statement.match(/</i)) {
            var sections = $st(statement).split(/</i);
            if (sections.length != 2) {
                throw new Error("Invalid SQL Statement");
            }
            statementObject = {
                fieldName: $st(sections[0]),
                sign: this.signConverter ? this.signConverter("lt") : "lt",
                valueName: $st(sections[1])
            }
        } else if (statement.match(/>/i)) {
            var sections = $st(statement).split(/>/i);
            if (sections.length != 2) {
                throw new Error("Invalid SQL Statement");
            }
            statementObject = {
                fieldName: $st(sections[0]),
                sign: this.signConverter ? this.signConverter("gt") : "gt",
                valueName: $st(sections[1])
            }
        } else {
            throw new Error("The following statement could not be processed: " + statement);
        }

        statementObject.negated = negated;
        return statementObject;
    },


    /**
     * @param <pre>fieldExpression such as "entityAlias.fieldName"
     * <li>it is possible to add aggregate function to the expression at the beginning with a colon as in aggregateFunction:entityAlias.fieldName
     * <li>possible functions expressions:
     * <li>- entityAlias.fieldName.fieldAlias: entityName is calculated out of the entityAlias<
     * <li>- * (star as for all fields): use the given entity as entityName
     * <li>- *.fieldAlias <br>//todo/kn.. check how this is used??
     * <li>- entityName.fieldName: entityAlias is calculated out of the entityName
     * <li>- fieldName: use the given entity as entityName, calculate the entityAlias out of the entityName</pre>
     * @param possibleFunctions a map of the possible aggregate functions
     * @param entity the name of the entity
     * @param aliases a map of the possible aliases
     * @returns {{aggregateFnc: *, entityName: *, entityAlias: *, fieldName: *, fieldAlias: *, isRelationField: boolean}}
     */
    fieldExpressionAsObject: function(fieldExpression, possibleFunctions, entity, aliases) {
        fieldExpression = $st(fieldExpression);
        fieldExpression = S.replaceAll(fieldExpression, ' ', '');
        var aggregateFnc = null;
        /**
         * extract the possible functions
         */
        _.forOwn(possibleFunctions, function (fncValue, fncKey) {
            var cleanFieldExpression = _.replace(fieldExpression, /\s/g, "").toUpperCase();
            if (cleanFieldExpression.toUpperCase().indexOf(fncKey.toUpperCase() + ":") != -1) {
                aggregateFnc = {key: fncKey, value: fncValue};
            }
        });
        var entityField;
        /**
         * after extracting the possible function, remove it from the expression
         */
        if (aggregateFnc != null) {
            entityField = _.replace(fieldExpression, new RegExp(aggregateFnc.key + ":", "gi"), "");
        } else {
            entityField = fieldExpression;
        }
        var entityFieldArray = entityField.split(".");
        var entityName = null, entityAlias = null, fieldName = null, fieldAlias = null;
        if (entityFieldArray.length == 3) {
            entityAlias = $st(entityFieldArray[0]);
            entityName = aliases[entityAlias];
            fieldName = $st(entityFieldArray[1]);
            fieldAlias = $st(entityFieldArray[2]);
        } else if (entityFieldArray.length == 2) {
            if($st(entityFieldArray[0])=='*') {
                entityName = $st(entity);
                fieldName = $st(entityFieldArray[0]);
                fieldAlias = $st(entityFieldArray[1]);
            } else {
                entityName = $st(entityFieldArray[0]);
                fieldName = $st(entityFieldArray[1]);
            }
        } else if (entityFieldArray.length == 1) {
            entityName = $st(entity);
            fieldName = $st(entityFieldArray[0]);
        } else {
            throw new Error("Invalid field expression: " + entityField);
        }

        if (entityAlias == null) {
            entityAlias = this.$alias4Entity(aliases, entityName);
        }

        var isRelationField = false;
        if (fieldName != '*') {
            var field = TM.fieldByName(entityName, fieldName);
            assert.isNotNull(field, "the field '" + entityName + "." + fieldName + "' could not be found")
            isRelationField = TM.isReferring(field.props.rel_type, field.props.rel_mappedBy);
        }

        return {
            aggregateFnc: aggregateFnc,
            entityName: entityName,
            entityAlias: entityAlias,
            fieldName: fieldName,
            fieldAlias: fieldAlias,
            isRelationField: isRelationField
        }
    },


    fieldAliasInQuery: function(fieldAlias, aggregateFnc, hasJoins) {
        var fieldExpression = "";
        if (fieldAlias != null) {
            fieldExpression = "<%=fieldAlias%>";
        } else {
            if (aggregateFnc != null) {
                fieldExpression = "<%=fnc_key%>_";
            }
            if (hasJoins) {
                fieldExpression += "<%=entityName%>_<%=fieldAliasInQuery%>";
            } else {
                fieldExpression += "<%=fieldNameInQuery%>";
            }
        }
        return fieldExpression;
    },

    prefixFields: function (entityName, entity) {
        var model = TM.modelDetails(entityName);
        assert.isTrue(!G.isNullEmpty(entity), "!G.isNullEmpty(entity)");
        G.toArray(model.fields).forEach(function (field) {
            var modelAlias = field["modelAlias"];
            if (G.isNullEmpty(modelAlias)) {
                modelAlias = "_this";
            }
            var fieldAliasName = modelAlias + '_' + field.name;
            entity[fieldAliasName] = entity[field.name];
        })
    }

}


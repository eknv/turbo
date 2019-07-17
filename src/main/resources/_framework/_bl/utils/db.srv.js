var DB_SRV = {

    defineSchema: function (config) {
        throw new Error("defineSchema method is not supported on the server side");
    },

    saveOrUpdate: function (entityName, package, entities2Save) {
        var self = this;
        var deferred = Q.defer();

        try {
            if (G.isNullEmpty(package)) {
                package = 'turbo';
            }
            var clazz = C.DBC.getClassLoader().loadClass(package + '.' + entityName);
            var ctor = clazz.getConstructor();
            var objects = [];
            entities2Save = G.inArray(entities2Save);
            entities2Save.forEach(function (entity2Save) {
                var id = G.int(entity2Save.id);
                var modelDetails = TM.modelDetails(entityName);
                var fieldList = modelDetails['fields'];
                /**
                 * change the value type of the values with primitive types
                 */
                G.toArray(fieldList).forEach(function (field) {
                    assert.isNotNull(field.name, "field name cannot be null")
                    if (!_.has(entity2Save, field.name)) {
                        return;
                    }
                    var columnType = field.props != null ? field.props.type : null;
                    if (columnType != null && columnType == "ID") {
                        columnType = "Integer";
                    }
                    if (!TM.isPrimitiveType(columnType)) {
                        return;
                    }
                    var columnValue = entity2Save[field.name]
                    if (columnValue != null) {
                        columnValue = self.convertType(columnType, columnValue)
                        entity2Save[field.name] = columnValue;
                    }
                })
                /**
                 * prepare an object to be stored in db
                 */
                var newEntity = null;
                if (id == null) {
                    newEntity = ctor.newInstance();
                } else {
                    newEntity = session.load(clazz, id);
                }
                G.toArray(fieldList).forEach(function (field) {
                    self.updateRelatedObjectsHBM(newEntity, package, entity2Save, field);
                })
                session.saveOrUpdate(newEntity);
                objects.push(newEntity);
            })
            if (!G.isNullEmpty(objects) && objects.length == 1) {
                deferred.resolve(objects[0])
            } else {
                deferred.resolve(objects);
            }
        } catch (e) {
            deferred.reject(e);
        }

        deferred.promise.fail(function (exception) {
            console.log(exception.stack)
            anyPromiseFailedException = exception;
        })

        return deferred.promise;
    },


    load: function (entityName, package, ids) {
        assert.isTrue(!G.isNullEmpty(ids), "no ids are available");
        ids = G.inArray(ids);
        var self = this;
        var deferred = Q.defer();
        try {
            if (G.isNullEmpty(package)) {
                package = 'turbo';
            }
            var loadStatement = "from " + package + "." + entityName + " \n";
            loadStatement += " where id in (:pIds) \n";
            var loadQuery = session.createQuery(loadStatement);
            loadQuery.setParameterList("pIds", TM.asLongArray(ids))
            var results = loadQuery.list();
            if (!G.isNullEmpty(results) && results.length == 1) {
                deferred.resolve(results[0])
            } else {
                deferred.resolve(results);
            }
        } catch (e) {
            deferred.reject(e);
        }

        deferred.promise.fail(function (exception) {
            console.log(exception.stack)
            anyPromiseFailedException = exception;
        })

        return deferred.promise;
    },


    read: function (config) {
        var self = this;
        var deferred = Q.defer();

        try {
            /** used later for retrieving the necessary field-type of the placeholders */
            var placeholder2Fieldname = {};

            var processedWhereClause = null;
            if (!G.isNullEmpty(config.where)) {
                var whereClauseObject = DB.prepareWhereClauseObject(config.where);
                processedWhereClause = self.prepareWhereClauseForHBM(whereClauseObject, placeholder2Fieldname, config);
            }

            var orderByStatement = "";
            if (config.orderBy != null) {
                orderByStatement += ' order by ';
                var orderByFieldArray = config.orderBy.split(",");
                orderByFieldArray.forEach(function (field, index) {
                    var fieldTokens = $st(field).split(" ");
                    if (fieldTokens.length == 2) {
                        orderByStatement += self.createOrderByStatementHBM($st(fieldTokens[0]), $st(fieldTokens[1]));
                    } else if (fieldTokens.length == 1) {
                        orderByStatement += self.createOrderByStatementHBM($st(fieldTokens[0]));
                    } else {
                        throw new Error("Invalid order by statement: " + field)
                    }
                    if (index != orderByFieldArray.length - 1) {
                        orderByStatement += ', ';
                    }
                })
            }

            var entities = [];
            var allFieldExpressions = [];
            var groupByExpressions = [];
            var joins = [];
            var package = config.package;
            if (G.isNullEmpty(package)) {
                package = 'turbo';
            }
            entities.push(config.entityName);

            var entityOrAlias = function (entity) {
                var alias = DB.$alias4Entity(config.aliases, entity);
                return alias != null ? alias : entity;
            }
            var entityAndAlias = function (entity) {
                var alias = DB.$alias4Entity(config.aliases, entity);
                return package + '.' + alias != null ? entity + ' ' + alias : entity;
            }

            if (config.joins) {
                config.joins.forEach(function (join) {
                    joins.push(self.retrieveJoinDetails(join))
                })
            }

            var anyAggregateFunctionsUsed = false;
            var allFieldDetails = [];
            /** used later for retrieving the necessary field-type of the placeholders */
            var aliasesToEntityNames = config.aliases;
            if (config.fields) {
                config.fields.forEach(function (fieldExpression) {
                    var fieldDetails = self.retrieveFieldDetailsHBM(fieldExpression, config.entityName, config.aliases, !G.isNullEmpty(joins));
                    allFieldDetails.push(fieldDetails);
                    allFieldExpressions.push(fieldDetails.asFieldExpression());
                    if (fieldDetails.fnc != null) {
                        anyAggregateFunctionsUsed = true;
                    }
                })
            } else {
                var allEntities = entities.slice();
                joins.forEach(function (join) {
                    var entityName1 = aliasesToEntityNames[join.entity1] != null ? aliasesToEntityNames[join.entity1] : join.entity1;
                    var entityName2 = aliasesToEntityNames[join.entity2] != null ? aliasesToEntityNames[join.entity2] : join.entity2;
                    if (!_.includes(allEntities, entityName1)) {
                        allEntities.push(entityName1);
                    }
                    if (!_.includes(allEntities, entityName2)) {
                        allEntities.push(entityName2);
                    }
                })

                allEntities.forEach(function (entityName) {
                    var entity = TM.modelDetails(entityName);
                    if (!G.isNullEmpty(entity.fields)) {
                        entity.fields.forEach(function (field) {
                            // if the field should be considered
                            if (G.isNullEmpty(field.props.rel_type) || TM.isReferring(field.props.rel_type, field.props.rel_mappedBy)) {

                                var entityAlias = _.findKey(aliasesToEntityNames, entityName);
                                if (entityAlias == null) {
                                    entityAlias = entityName;
                                }
                                var fieldExpression = entityAlias + '.' + field.name;

                                var fieldDetails = self.retrieveFieldDetailsHBM(fieldExpression, config.entityName, config.aliases, !G.isNullEmpty(joins));
                                allFieldDetails.push(fieldDetails);
                                allFieldExpressions.push(fieldDetails.asFieldExpression());
                            }
                        })
                    }
                })
            }

            if (anyAggregateFunctionsUsed) {
                allFieldDetails.forEach(function (fieldDetails) {
                    if (fieldDetails.fnc == null) {
                        groupByExpressions.push(fieldDetails.asGroupByExpression())
                    }
                })
            }

            /**
             * put the script together
             */
            var joinStatements = [];
            joins.forEach(function (join) {
                var joinStatement = _.template('<%=joinType%> <%=entity1%>.<%=field1%> <%=entity2%>')
                ({
                    joinType: join.joinType == 'inner' ? "inner join" : "left outer join",
                    entity1: entityOrAlias(join.entity1),
                    field1: join.field1,
                    entity2: entityOrAlias(join.entity2),
                    field2: join.field2
                });
                joinStatements.push(joinStatement)
            })

            var script = '';

            assert.isTrue(!G.isNullEmpty(allFieldExpressions), 'Field expressions cannot be empty!');
            script += _.template('select new map(\n<%=fieldsExpressionsCommaSeparated%>  \n)')
            ({
                fieldsExpressionsCommaSeparated: allFieldExpressions.join(',\n')
            });
            script += _.template(' from <%=entitiesCommaSeparated%> \n')
            ({
                entitiesCommaSeparated: _.map(entities, entityAndAlias).join(',\n')
            });

            if (!G.isNullEmpty(joinStatements)) {
                script += _.template(' <%=joinStatementsCommaSeparated%> \n')
                ({
                    joinStatementsCommaSeparated: joinStatements.join(' \n')
                });
            }

            if (!G.isNullEmpty(processedWhereClause)) {
                script += ' where ' + processedWhereClause + ' \n';
            }

            console.log('groupByExpressions: ', groupByExpressions)
            if (!G.isNullEmpty(groupByExpressions)) {
                script += _.template(' group by \n<%=groupByExpressionsCommaSeparated%> \n')
                ({groupByExpressionsCommaSeparated: groupByExpressions.join()});
            }

            //todo/kn.. consider the having as well for the aggregate functions

            if (!G.isNullEmpty(orderByStatement)) {
                script += orderByStatement + ' \n';
            }

            console.log(script);

            var query = session.createQuery(script);
            if (!G.isNullEmpty(config.params)) {
                /**
                 * convert the field-type of the config.params fields to the expected ones by hbm
                 */
                var placeholder2Type = {}
                _.forOwn(config.params, function (value, placeholder) {
                    var fieldExpression = placeholder2Fieldname[":" + placeholder];
                    var fieldInfo = self.fieldInfoFromExpression(fieldExpression, config.entityName, aliasesToEntityNames);
                    placeholder2Type[placeholder] = fieldInfo.fieldType;
                    config.params[placeholder] = self.convertType(fieldInfo.fieldType, value);
                });
                /**
                 * set the query parameters
                 */
                query.setProperties(config.params);
            }
            if (config.skip != null) {
                query.setFirstResult(G.int(config.skip));
            }
            if (config.limit != null) {
                query.setMaxResults(G.int(config.limit))
            }
            var results;
            if (G.isTrue(config.unique)) {
                results = query.uniqueResult();
            } else {
                results = query.list();
            }
            deferred.resolve(results);
        } catch (e) {
            deferred.reject(e);
        }

        deferred.promise.fail(function (exception) {
            console.log(exception.stack);
            anyPromiseFailedException = exception;
        })

        return deferred.promise;
    },


    delete: function (config) {
        var self = this;
        var deferred = Q.defer();

        try {

            /** used later for retrieving the necessary field-type of the placeholders */
            var placeholder2Fieldname = {};
            var processedWhereClause = null;
            if (!G.isNullEmpty(config.where)) {
                var whereClauseObject = DB.prepareWhereClauseObject(config.where);
                processedWhereClause = self.prepareWhereClauseForHBM(whereClauseObject, placeholder2Fieldname, config);
            }

            var package = config.package;
            if (G.isNullEmpty(package)) {
                package = 'turbo';
            }
            var script = '';
            script += _.template('delete <%=entity%> \n')
            ({
                entity: package + '.' + config.entityName
            });

            if (!G.isNullEmpty(processedWhereClause)) {
                script += ' where ' + processedWhereClause + ' \n';
            }
            console.log(script);
            var query = session.createQuery(script);
            if (!G.isNullEmpty(config.params)) {
                /**
                 * convert the field-type of the config.params fields to the expected ones by hbm
                 */
                var placeholder2Type = {}
                _.forOwn(config.params, function (value, placeholder) {
                    var fieldExpression = placeholder2Fieldname[":" + placeholder];
                    var fieldInfo = self.fieldInfoFromExpression(fieldExpression, config.entityName, null);
                    placeholder2Type[placeholder] = fieldInfo.fieldType;
                    config.params[placeholder] = self.convertType(fieldInfo.fieldType, value);
                });
                /**
                 * set the query parameters
                 */
                query.setProperties(config.params);
            }
            var results = query.executeUpdate();
            deferred.resolve(results);
        } catch (e) {
            deferred.reject(e);
        }

        deferred.promise.fail(function (exception) {
            console.log(exception.stack);
            anyPromiseFailedException = exception;
        })

        return deferred.promise;
    },


    update: function (config) {
        var self = this;
        var deferred = Q.defer();

        try {
            var placeholder2Fieldname = {};

            assert.isTrue(!G.isNullEmpty(config.set), '!G.isNullEmpty(config.set)');
            var processedSetClause = config.set;
            /**
             * extract the placeholder out of the set statement and associate them to the respective field names
             */
            var sets = config.set.split(",");
            sets.forEach(function (set) {
                if (set.indexOf(":") == -1) {
                    return;
                }
                var setSections = set.split("=");
                assert.isTrue(!G.isNullEmpty(setSections) && setSections.length == 2, "!G.isNullEmpty(setSections) && setSections.length == 2");
                var placeholders = set.match(/:\b[\w]*\b/gi); // find the word starting with colon (:)
                placeholders.forEach(function (placeholder) {
                    placeholder2Fieldname[$st(placeholder)] = $st(setSections[0]);
                })
            })

            /** used later for retrieving the necessary field-type of the placeholders */
            var processedWhereClause = null;
            if (!G.isNullEmpty(config.where)) {
                var whereClauseObject = DB.prepareWhereClauseObject(config.where);
                processedWhereClause = self.prepareWhereClauseForHBM(whereClauseObject, placeholder2Fieldname, config);
            }

            var package = 'turbo';
            var script = '';
            script += _.template('update <%=entity%> set \n')
            ({
                entity: package + '.' + config.entityName
            });

            script += processedSetClause + ' \n';

            if (!G.isNullEmpty(processedWhereClause)) {
                script += ' where ' + processedWhereClause + ' \n';
            }

            // console.log(script);
            var query = session.createQuery(script);
            if (!G.isNullEmpty(config.params)) {
                /**
                 * convert the field-type of the config.params fields to the expected ones by hbm
                 */
                var placeholder2Type = {}
                _.forOwn(config.params, function (value, placeholder) {
                    var fieldExpression = placeholder2Fieldname[":" + placeholder];
                    var fieldInfo = self.fieldInfoFromExpression(fieldExpression, config.entityName, null);
                    placeholder2Type[placeholder] = fieldInfo.fieldType;
                    config.params[placeholder] = self.convertType(fieldInfo.fieldType, value);
                });
                /**
                 * set the query parameters
                 */
                query.setProperties(config.params);
            }
            var results = query.executeUpdate();
            deferred.resolve(results);
        } catch (e) {
            deferred.reject(e);
        }

        deferred.promise.fail(function (exception) {
            console.log(exception.stack);
            anyPromiseFailedException = exception;
        })

        return deferred.promise;
    },


    /************************************************************
     * Helper methods
     ************************************************************/

    fieldInfoFromExpression: function (fieldExpression, mainEntityName, aliasesToEntityNames) {
        var entityName, fieldName;
        assert.isTrue(!G.isNullEmpty(fieldExpression), '!G.isNullEmpty(fieldExpression)')
        if (fieldExpression.indexOf(".") != -1) {
            var fieldDetails = fieldExpression.split(".");
            entityName = fieldDetails[0];
            fieldName = fieldDetails[1];
        } else {
            entityName = mainEntityName;
            fieldName = fieldExpression;
        }

        if (!G.isNullEmpty(aliasesToEntityNames) && aliasesToEntityNames[entityName] != null) {
            entityName = aliasesToEntityNames[entityName];
        }

        var field = TM.fieldByName(entityName, fieldName);
        console.log("field: ", field)
        var fieldType = field.props.type;
        return {
            entityName: entityName,
            fieldName: fieldName,
            fieldType: fieldType
        }
    },


    /**
     * this method is used in the parent class if present to retrieve the correct equation signs in the hql statements
     */
    signConverter: function (sign) {
        assert.isNotNull(sign, "sign cannot be null");
        var finalSign;
        if (sign == 'neq') {
            finalSign = '!=';
        } else if (sign == 'eq') {
            finalSign = '=';
        } else if (sign == 'lt') {
            finalSign = '<';
        } else if (sign == 'gt') {
            finalSign = '>';
        } else if (sign == 'lte') {
            finalSign = '<=';
        } else if (sign == 'gte') {
            finalSign = '>=';
        } else if (sign == 'match') {
            finalSign = 'like';
        } else if (sign == 'between') {
            finalSign = 'between';
        } else if (sign == 'in') {
            finalSign = 'in';
        } else if (sign == 'is null') {
            finalSign = 'is null';
        } else if (sign == 'is not null') {
            finalSign = 'is not null';
        }
        return finalSign;
    },

    updateRelatedObjectsHBM: function (newEntity, package, entity2Save, field) {
        //todo/kn.. provide custom assert object with proper implementation of the isNotNull and other methods
        assert.isNotNull(field, "field cannot be null");
        assert.isNotNull(field.name, "field.name cannot be null");
        assert.isNotNull(field.props, "field.props cannot be null");
        assert.isNotNull(field.props.type, "field.props.type cannot be null");
        var fieldName = field.name;
        var fieldType = field.props.type;
        var fieldRelationshipType = field.props.rel_type;
        var fieldRelationshipMappedBy = field.props.rel_mappedBy;

        if (!_.hasIn(entity2Save, fieldName)) {
            return;
        }

        /**
         * in case a relationship field is being changed
         * this is mostly the case if just one field of an object is being changed
         */
        if (!G.isNullEmpty(entity2Save[fieldName + "_$$id"])
            && !G.isNullEmpty(entity2Save[fieldName + "_$$type"])
            && !TM.isPrimitiveType(fieldType)
            && fieldRelationshipType == 'manytoone') {
            var relatedObjectId = G.int(entity2Save[fieldName + "_$$id"])
            var relatedObjectType = entity2Save[fieldName + "_$$type"];
            var relatedObjectClass = C.DBC.getClassLoader().loadClass(package + "." + relatedObjectType);
            var relatedObject = session.load(relatedObjectClass, relatedObjectId);
            newEntity[fieldName] = relatedObject;
        }
        /**
         * primitive fields or certain relationship fields
         */
        else {
            if (TM.isPrimitiveType(fieldType) || fieldRelationshipType == 'manytoone'
                // in case of many-to-one or one-to-one, the side that is responsible for saving
                || ((fieldRelationshipType == 'manytomany' || fieldRelationshipType == 'onetoone') && G.isNullEmpty(fieldRelationshipMappedBy))
            ) {
                newEntity[fieldName] = entity2Save[fieldName];
            }
        }
    },


    /**
     * @param fieldExpression the field statement
     * @param mainEntity the main entity name
     * @param aliases a map of the aliases to the entity names
     * @param hasJoins whether this query has any joins
     * @returns {{entityName: *, aliasName: *, fieldName: *, fnc, asFieldExpression: asFieldExpression, asGroupByExpression: asGroupByExpression}}
     */
    retrieveFieldDetailsHBM: function (fieldExpression, mainEntity, aliases, hasJoins) {

        //todo/kn refactor the usages of distinct
        var possibleFunctions = {
            'AVG': 'avg',
            'COUNT': 'count',
            'MAX': 'max',
            'MIN': 'min',
            'SUM': 'sum'
        }

        var feo = DB.fieldExpressionAsObject(fieldExpression, possibleFunctions, mainEntity, aliases);
        assert.isTrue(feo != null, "feo!=null");

        var fieldAliasInQuery = DB.fieldAliasInQuery(feo.fieldAlias, feo.aggregateFnc, hasJoins);
        var fieldNameInQuery = $st(feo.fieldName) == '*' ? '<%=fieldName%>' : '<%=entityName%>.<%=fieldName%>';
        /**
         * in case of relationship type, do not load the whole related object, but just its id
         */
        if (feo.isRelationField == true) {
            fieldNameInQuery += '.id';
        }

        return {
            entityName: aliases != null && aliases[feo.entityName] != null ? aliases[feo.entityName] : feo.entityName,
            aliasName: feo.entityName,
            fieldName: feo.fieldName,
            fnc: feo.aggregateFnc,
            asFieldExpression: function () {
                if (feo.aggregateFnc != null) {
                    return _.template('<%=fnc_val%>(' + fieldNameInQuery + ') as ' + fieldAliasInQuery + '\n')({
                        fnc_key: feo.aggregateFnc.key,
                        fnc_val: feo.aggregateFnc.value,
                        entityName: feo.entityAlias != null ? feo.entityAlias : feo.entityName,
                        fieldName: feo.fieldName,
                        fieldAliasInQuery: $st(feo.fieldName) != '*' ? feo.fieldName : 'star',
                        fieldAlias: feo.fieldAlias
                    });
                } else {
                    return _.template(fieldNameInQuery + ' as ' + fieldAliasInQuery + '\n')({
                        entityName: feo.entityAlias != null ? feo.entityAlias : feo.entityName,
                        fieldName: feo.fieldName,
                        fieldAliasInQuery: $st(feo.fieldName) != '*' ? feo.fieldName : 'star',
                        fieldAlias: feo.fieldAlias
                    });
                }
            },
            asGroupByExpression: function () {
                return _.template(fieldNameInQuery + '\n')({
                    entityName: feo.entityAlias != null ? feo.entityAlias : feo.entityName,
                    fieldName: feo.fieldName
                });
            }
        }
    },


    formatEquationForHBM: function (sectionObject, placeholder2Fieldname, config) {

        //todo/kn.. test this
        // comment out the other changes and test the existing code

        var fieldInfo = this.fieldInfoFromExpression(sectionObject.fieldName, config.entityName, config.aliases);
        var fieldType = fieldInfo.fieldType;

        var equationForHibernate;
        if (sectionObject.valueName != null && sectionObject.valueName2 != null) {
            equationForHibernate = sectionObject.fieldName + ' ' + sectionObject.sign + ' '
                + this.addTickMarkToValueName(sectionObject.valueName, fieldType)
                + ' and ' + this.addTickMarkToValueName(sectionObject.valueName2, fieldType);
        } else if (sectionObject.valueName != null) {
            equationForHibernate = sectionObject.fieldName + ' ' + sectionObject.sign
                + ' ' + this.addTickMarkToValueName(sectionObject.valueName, fieldType);
        } else {
            equationForHibernate = sectionObject.fieldName + ' ' + sectionObject.sign;
        }
        if (sectionObject.negated) {
            equationForHibernate = "!(" + equationForHibernate + ")";
        }

        if (sectionObject.valueName != null && sectionObject.valueName.contains(":")) {
            placeholder2Fieldname[sectionObject.valueName] = sectionObject.fieldName;
        }
        if (sectionObject.valueName2 != null && sectionObject.valueName2.contains(":")) {
            placeholder2Fieldname[sectionObject.valueName2] = sectionObject.fieldName;
        }

        return equationForHibernate;
    },

    /**
     * todo/kn.. check whether the data types are considered in this method
     */
    addTickMarkToValueName: function (valueName, columnType) {
        if (columnType == null) {
            return valueName;
        }
        var valueNameStatement = '';
        var addTick = false;
        if (columnType == 'DateTime' || columnType == 'Date' || columnType == 'Time') {
            addTick = true;
        }
        valueNameStatement += addTick ? "'" : '';
        valueNameStatement += valueName;
        valueNameStatement += addTick ? "'" : '';
        return valueNameStatement;
    },

    prepareWhereClauseForHBM: function (preparedWhereClauseObject, placeholder2Fieldname, config) {
        var self = this;
        var finalWhereClause = '';
        if (preparedWhereClauseObject.fnc != null) {
            finalWhereClause += "(";
            for (var i = 0; i < preparedWhereClauseObject.sections.length; i++) {
                var section = preparedWhereClauseObject.sections[i];
                finalWhereClause += self.prepareWhereClauseForHBM(section, placeholder2Fieldname, config);
                if (i != preparedWhereClauseObject.sections.length - 1) {
                    finalWhereClause += "AND" == preparedWhereClauseObject.fnc ? " and " : " or ";
                }
            }
            finalWhereClause += ")";
        } else {
            finalWhereClause += self.formatEquationForHBM(preparedWhereClauseObject, placeholder2Fieldname, config);
        }
        return finalWhereClause;
    },


    /**
     * @param field field-name or alias
     * @param sortOrder ASC or DESC
     */
    createOrderByStatementHBM: function (field, sortOrder) {
        var orderByStatement;
        if (sortOrder != null && $stu(sortOrder) == "DESC") {
            orderByStatement = " <%=field%> desc ";
        } else {
            orderByStatement = " <%=field%> ";
        }
        return _.template(orderByStatement)({field: field});
    },


    /**
     * @param columnType
     * @param columnValue
     * @returns the column value in the correct object type
     */
    convertType: function (columnType, columnValue) {
        var self = this;
        if (C.GeneralUtil.isNullOrEmpty(columnValue)) {
            return null;
        }

        if(G.isArray(columnValue)) {
            var list = new C.ArrayList();
            columnValue.forEach(function (value) {
                list.add(self.convertType(columnType, value))
            })
            return list;
        }

        if (columnType == 'DateTime') {
            return dateUtil.localDateTime(columnValue)
        } else if (columnType == 'Date') {
            return dateUtil.localDate(columnValue)
        } else if (columnType == 'Time') {
            return dateUtil.localTime(columnValue)
        } else if (columnType == 'Decimal') {
            return new C.BigDecimal(columnValue);
        } else if (columnType == 'Integer') {
            return C.Long.valueOf(columnValue);
        } else if (columnType == 'String') {
            return C.String.valueOf(columnValue);
        } else if (columnType == 'Boolean') {
            return C.Boolean.valueOf(columnValue);
        } else if (columnType == 'ID') {
            return C.Long.valueOf(columnValue);
        }
        return columnValue
    }

}

var DB = _.extend(DB, DB_SRV);

var C = null;
var DB_CLN = {

    _initializedEntities: [],
    //todo/kn.. after saving the design-data.. reload the cache

    schemaBuilder: null,
    dbPromise: null,

    MAX_LOW: null,
    currentHigh: null,
    currentId: null,

    /**
     * this method returns a promise
     */
    nextId: function () {
        var self = this;
        var id_deferred = Q.defer();
        if (G.isNullEmpty(this.currentId) || this.currentId > (this.currentHigh + 1) * this.MAX_LOW) {
            // get a new high value and calculate the id again
            $$.execute("current-high")
                .then(function (currentHigh) {
                    self.currentHigh = currentHigh;
                    self.currentId = (self.currentHigh * self.MAX_LOW) + 1;
                    id_deferred.resolve(self.currentId++);
                });
        } else {
            id_deferred.resolve(this.currentId++);
        }
        return id_deferred.promise;
    },

    init: function (version, MAX_LOW) {
        this.schemaBuilder = lf.schema.create('trainer', version);
        assert.isTrue(!G.isNullEmpty(MAX_LOW), '!G.isNullEmpty(MAX_LOW)')
        this.MAX_LOW = MAX_LOW;
    },

    getDB: function () {
        var self = this;
        if (!G.isNullEmpty(self.dbPromise)) {
            return self.dbPromise;
        } else {
            self.dbPromise = self.schemaBuilder.connect();
            return self.dbPromise;
        }

        self.dbPromise = self.schemaBuilder.connect();
        return self.dbPromise;

    },

    defineSchema: function (config) {
        assert.isTrue(!G.isNullEmpty(config) && !G.isNullEmpty(config.entityName),
            "!G.isNullEmpty(config) && !G.isNullEmpty(config.entityName)");
        if (this._initializedEntities.indexOf(config.entityName) != -1) {
            return;
        }
        var entityBuilder = this.schemaBuilder.createTable(config.entityName);
        var columns = G.inArray(config.columns);
        if (columns != null) {
            var primaryKeys = [];
            var nullables = [];
            columns.forEach(function (column) {
                var columnType;
                if (column.type == 'integer') {
                    columnType = lf.Type.INTEGER;
                } else if (column.type == 'decimal') {
                    columnType = lf.Type.NUMBER;
                } else if (column.type == 'string') {
                    columnType = lf.Type.STRING;
                } else if (column.type == 'boolean') {
                    columnType = lf.Type.BOOLEAN
                } else if (column.type == 'date') {
                    columnType = lf.Type.DATE_TIME
                }
                entityBuilder.addColumn(column.name, columnType);
                if (column.fk != null) {
                    var fkName = 'fk_' + column.name + '_' + column.fk.replace('.', '_');
                    entityBuilder.addForeignKey(fkName, {
                        local: column.name,
                        ref: column.fk,
                        action: lf.ConstraintAction.RESTRICT
                    });
                }
                if (column.primary == true) {
                    primaryKeys.push(column.name);
                }
                if (column.mandatory != true && column.primary != true) {
                    nullables.push(column.name);
                }
            });
            entityBuilder.addPrimaryKey(primaryKeys);
            entityBuilder.addNullable(nullables);
        }
        var indexes = G.inArray(config.indexes);
        if (indexes != null) {
            indexes.forEach(function (index) {
                entityBuilder.addIndex(index.indexName, index.indexFields, index.isUnique, index.order);
            });
        }
        this._initializedEntities.push(config.entityName)
    },

    saveOrUpdate: function (entityName, package, entities) {
        var self = this;

        var deferred = Q.defer();

        self.getDB().then(function (database) {
            entities = G.inArray(entities);
            if (entities == null) {
                deferred.resolve(null);
            }

            var id_deferred = Q.defer();

            /**
             * Get the schema representation of table
             * All schema-related APIs are synchronous.
             */
            var table = database.getSchema().table(entityName);
            /**
             * Creates a row. Lovefield does not accept plain objects as row.
             * Use the createRow() API provided in table schema to create a row.
             */
            var rows = [];
            var modelDetails = TM.modelDetails(entityName);
            assert.isTrue(!G.isNullEmpty(modelDetails), "!G.isNullEmpty(modelDetails)");
            entities.forEach(function (entity) {
                /**
                 * convert the values to the respective types if necessary
                 */
                G.toArray(modelDetails.fields).forEach(function (field) {
                    var fieldName = field.name;
                    var value = entity[fieldName];
                    if (!G.isNullEmpty(value)) {
                        var field = TM.fieldByName(entityName, fieldName);
                        var modelFieldType = field.props.type;
                        var clnFieldType = DB.convertToClnType(modelFieldType);
                        if (clnFieldType == 'date' && typeof value === 'string') {
                            //todo/kn.. this needs refactoring
                            entity[fieldName] = new Date(value + 'Z')
                        }
                    }
                })
                /**
                 * assign an id if it does not have any
                 */
                try {
                    if (entity.id == null) {
                        self.nextId()
                            .then(function (nextId) {
                                entity.id = nextId;
                                rows.push(table.createRow(entity))
                                id_deferred.resolve();
                            });
                    } else {
                        rows.push(table.createRow(entity))
                        id_deferred.resolve();
                    }
                } catch (e) {
                    id_deferred.reject(e);
                }

            });


            id_deferred.promise
                .then(function () {
                    // INSERT OR REPLACE INTO table VALUES rows;
                    // The exec() method returns a Promise.
                    database.insertOrReplace().into(table).values(rows).exec()
                        .then(function (results) {
                            if (!G.isNullEmpty(results) && results.length == 1) {
                                deferred.resolve(results[0])
                            } else {
                                deferred.resolve(results);
                            }
                        })
                        .catch(function (exception) {
                            deferred.reject(exception);
                        });
                }).catch(function (exception) {
                deferred.reject(exception);
            })

        })

        return deferred.promise;
    },

    load: function (entityName, package, ids) {
        var self = this;
        var deferred = Q.defer();
        self.getDB().then(function (database) {
            ids = G.inArray(ids);
            if (ids == null) {
                return;
            }
            var table = database.getSchema().table(entityName);
            return database.select().from(table).where(table.id.in(ids)).exec()
                .then(function (results) {
                    if (!G.isNullEmpty(results) && results.length == 1) {
                        deferred.resolve(results[0])
                    } else {
                        deferred.resolve(results);
                    }
                })
                .catch(function (exception) {
                    deferred.reject(exception)
                });
        })
        return deferred.promise
    },


    read: function (config) {
        var self = this;

        var entities = [];
        var allFieldExpressions = [];
        var groupByExpressions = [];
        var joins = [];
        entities.push(config.entityName);

        var aliases = config.aliases != null ? config.aliases : [];

        var aliasOrEntity = function (entity) {
            var alias = self.$alias4Entity(aliases, entity);
            return alias != null ? alias : entity;
        }

        if (config.joins) {
            config.joins.forEach(function (join) {
                joins.push(self.retrieveJoinDetails(join))
            })
        }

        var processedWhereClause = '';
        /**
         * dummy where-clause in order to have a true predicate all the time
         * note that it assumes there is an "id" column in each table
         */
        processedWhereClause += _.template('<%=entity%>.<%=field%>.eq(<%=entity%>.<%=field%>)\n')({
            entity: aliasOrEntity(config.entityName),
            field: 'id'
        })
        var bindArray = [];
        if (!G.isNullEmpty(config.where)) {
            var whereClauseObject = DB.prepareWhereClauseObject(config.where);
            // console.log(whereClauseObject);
            processedWhereClause = self.prepareWhereClauseForLF(whereClauseObject, config.entityName);
            // console.log(processedWhereClause);
            var placeHolderRE = /(?:^|\W):(\w+)(?!\w)/g, match, placeholders = [];
            while (match = placeHolderRE.exec(processedWhereClause)) {
                placeholders.push($st(match[1]))
            }
            if (config.params == null) {
                config.params = {}
            }
            placeholders.forEach(function (placeholder, index) {
                bindArray.push(config.params[placeholder]);
                processedWhereClause = S.replaceAll(processedWhereClause, ":" + placeholder, "lf.bind(" + index + ")")
            });
        }

        var orderByStatement = "";
        if (config.orderBy != null) {
            var orderByField = config.orderBy.split(",");
            orderByField.forEach(function (field) {
                var fieldTokens = $st(field).split(" ");
                if (fieldTokens.length == 2) {
                    orderByStatement += self.createOrderByStatementLF($st(fieldTokens[0]), $st(fieldTokens[1]));
                } else if (fieldTokens.length == 1) {
                    orderByStatement += self.createOrderByStatementLF($st(fieldTokens[0]));
                } else {
                    throw new Error("Invalid order by statement: " + field)
                }
            })
        }

        var anyAggregateFunctionsUsed = false;
        var allFieldDetails = [];
        G.toArray(config.fields).forEach(function (field) {
            var fieldDetails = self.retrieveFieldDetailsLF(field, config.entityName, aliases, !G.isNullEmpty(joins));
            allFieldDetails.push(fieldDetails)
            allFieldExpressions.push(fieldDetails.asFieldExpression());
            if (fieldDetails.fnc != null) {
                anyAggregateFunctionsUsed = true;
            }
        })

        if (anyAggregateFunctionsUsed) {
            allFieldDetails.forEach(function (fieldDetails) {
                if (fieldDetails.fnc == null) {
                    groupByExpressions.push(fieldDetails.asGroupByExpression())
                }
            })
        }

        var joinStatement = '';
        joins.forEach(function (join) {
            var entity1 = aliases[join.entity1] != null ? aliases[join.entity1] : join.entity1;
            entity1 = self.exactEntityName(entity1);
            var entity2 = aliases[join.entity2] != null ? aliases[join.entity2] : join.entity2;
            entity2 = self.exactEntityName(entity2);

            if (!_.includes(entities, entity1)) {
                entities.push(entity1);
            }
            if (!_.includes(entities, entity2)) {
                entities.push(entity2);
            }
            joinStatement += _.template('.<%=joinType%>(<%=entity2%>, <%=entity1%>.<%=field1%>.eq(<%=entity2%>.<%=field2%>))\n')({
                entity1: join.entity1,
                field1: join.field1,
                entity2: join.entity2,
                field2: join.field2,
                joinType: join.type == 'inner' ? 'innerJoin' : 'leftOuterJoin'
            })
        })

        var self = this;
        var deferred = Q.defer();

        self.getDB().then(function (database) {

            /**
             * put the script together
             */
            var init_script = "";
            entities.forEach(function (entity) {
                var alias = self.$alias4Entity(aliases, entity);
                if (alias != null) {
                    init_script += _.template('var <%=alias%> = database.getSchema().table(\'<%=entity%>\').as(\'<%=alias%>\');\n')({
                        entity: entity,
                        alias: alias
                    })
                } else {
                    init_script += _.template('var <%=entity%> = database.getSchema().table(\'<%=entity%>\');\n')({'entity': entity})
                }
            })
            /*console.log('init_script: ', init_script);*/
            eval(init_script);

            var script = 'var joinPredicatesArray = [];\n';
            /*            joins.forEach(function (join) {
             script += _.template('joinPredicatesArray.push(<%=entity1%>.<%=field1%>.eq(<%=entity2%>.<%=field2%>));\n')
             ({
             entity1: aliasOrEntity(join.entity1),
             field1: join.field1,
             entity2: aliasOrEntity(join.entity2),
             field2: join.field2
             });
             })*/

            if (!G.isNullEmpty(processedWhereClause)) {
                // console.log(processedWhereClause);
                processedWhereClause = "var whereClausePredicate = " + processedWhereClause;
                eval(processedWhereClause);
                script += 'joinPredicatesArray.push(whereClausePredicate);\n';
            }

            script += 'var joinPredicates = G.isNullEmpty(joinPredicatesArray)? null: lf.op.and.apply(null, joinPredicatesArray);\n';
            script += _.template('var query = database.select(\n<%=fieldsExpressionsCommaSeparated%>).from(<%=entitiesCommaSeparated%>)\n')
            ({
                fieldsExpressionsCommaSeparated: allFieldExpressions.join(),
                entitiesCommaSeparated: self.$alias4Entity(aliases, config.entityName)// _.map(entities, aliasOrEntity).join()
            });

            if (!G.isNullEmpty(joinStatement)) {
                script += joinStatement + '\n';
            }

            script += '.where(joinPredicates)\n';

            if (!G.isNullEmpty(orderByStatement)) {
                script += orderByStatement + '\n';
            }

            if (!G.isNullEmpty(groupByExpressions)) {
                script += _.template('.groupBy(\n<%=groupByExpressionsCommaSeparated%>)\n')
                ({groupByExpressionsCommaSeparated: groupByExpressions.join()});
            }

            if (config.limit != null) {
                script += _.template(".limit(<%=limit%>)\n")({limit: config.limit});
            }

            if (config.skip != null) {
                script += _.template(".skip(<%=skip%>)\n")({skip: config.skip});
            }

            script += ';\n';

            if (config.where != null) {
                script += 'query.bind(bindArray);\n';
            }
            script += 'var dbPromise = query.exec();\n';

            //todo/kn comment in for seeing the executed lovefield sql script
            /*console.log(script);*/
            eval(script);
            dbPromise.then(function (result) {
                if (G.isTrue(config.unique)) {
                    assert.isTrue(G.isNullEmpty(result) || (G.isArray(result) && result.length == 1),
                        "G.isNullEmpty(result) || (G.isArray(result) && result.length==1)");
                    if (result != null) {
                        result = result[0];
                    }
                }
                deferred.resolve(result);
            })
                .catch(function (exception) {
                    deferred.reject(exception)
                });
        })

        return deferred.promise

    },

    // todo/kn.. add the necessary asserts.. the mandatory fields
    // show warning for those fields which are not considered and yet provided
    delete: function (config) {
        var self = this;
        assert.isNotNull(config.entity, "'config.entity' section is mandatory!")

        var processedWhereClause = null;
        var bindArray = [];

        if (config.where != null) {
            var whereClauseObject = DB.prepareWhereClauseObject(config.where);
            // console.log(whereClauseObject);
            processedWhereClause = self.prepareWhereClauseForLF(whereClauseObject, config.entityName);
            // console.log(processedWhereClause);
            var placeHolderRE = /(?:^|\W):(\w+)(?!\w)/g, match, placeholders = [];
            while (match = placeHolderRE.exec(processedWhereClause)) {
                placeholders.push($st(match[1]))
            }
            if (config.params == null) {
                config.params = {}
            }
            placeholders.forEach(function (placeholder, index) {
                bindArray.push(config.params[placeholder]);
                processedWhereClause = S.replaceAll(processedWhereClause, ":" + placeholder, "lf.bind(" + index + ")")
            });
        }

        var deferred = Q.defer();

        self.getDB().then(function (database) {
            /**
             * put the script together
             */
            var init_script = _.template('var <%=entity%> = database.getSchema().table(\'<%=entity%>\');\n')({'entity': config.entityName});
            // console.log(init_script)
            eval(init_script);

            var script = '';
            script += _.template('var query = database.delete().from(<%=entity%>)\n')({'entity': config.entityName});

            if (config.where != null) {
                script += _.template('.where(<%=processedWhereClause%>)\n')({'processedWhereClause': processedWhereClause});
            }
            script += ';\n';
            if (config.where != null) {
                script += 'query.bind(bindArray);\n';
            }
            script += 'var dbPromise = query.exec();\n';
            // console.log(script);
            eval(script);
            dbPromise.then(function (result) {
                deferred.resolve(result);
            })
                .catch(function (exception) {
                    deferred.reject(exception)
                });
        })

        return deferred.promise;
    },


    update: function (config) {
        var self = this;
        assert.isTrue(!G.isNullEmpty(config.entityName), "!G.isNullEmpty(config.entityName)")

        var processedWhereClause = null;
        var processedSetClause = '';
        var bindArray = [];
        var bindArrayIndex = 0;

        if (config.params == null) {
            config.params = {}
        }

        assert.isTrue(!G.isNullEmpty(config.set), "!G.isNullEmpty(config.set)")
        var sets = config.set.split(",");
        sets.forEach(function (set) {
            var setSections = set.split("=");
            assert.isTrue(!G.isNullEmpty(setSections) && setSections.length == 2, "!G.isNullEmpty(setSections) && setSections.length == 2");
            processedSetClause += '.set(';
            processedSetClause += $st(config.entityName) + '.' + $st(setSections[0]) + ', ' + 'lf.bind(' + bindArrayIndex + ')'
            processedSetClause += ')\n';
            bindArrayIndex++;
            var placeholder = $st(setSections[1]).substring(1);
            var field = TM.fieldByName($st(config.entityName), $st(setSections[0]));
            assert.isTrue(!G.isNullEmpty(field), "!G.isNullEmpty(field)");
            config.params[placeholder] = self.convertType(field.props.type, config.params[placeholder]);
            bindArray.push(config.params[placeholder]);
        })

        if (!G.isNullEmpty(config.where)) {
            var whereClauseObject = DB.prepareWhereClauseObject(config.where);
            processedWhereClause = self.prepareWhereClauseForLF(whereClauseObject, config.entityName);
            var placeHolderRE = /(?:^|\W):(\w+)(?!\w)/g, match, placeholders = [];
            while (match = placeHolderRE.exec(processedWhereClause)) {
                placeholders.push($st(match[1]))
            }
            placeholders.forEach(function (placeholder) {
                bindArray.push(config.params[placeholder]);
                processedWhereClause = S.replaceAll(processedWhereClause, ":" + placeholder, "lf.bind(" + bindArrayIndex + ")");
                bindArrayIndex++;
            });
        }

        var deferred = Q.defer();

        self.getDB().then(function (database) {
            /**
             * put the script together
             */
            var init_script = _.template('var <%=entity%> = database.getSchema().table(\'<%=entity%>\');\n')({'entity': config.entityName});
            eval(init_script);

            var script = '';
            script += _.template('var query = database.update(<%=entity%>)\n')({'entity': config.entityName});
            script += processedSetClause;
            if (config.where != null) {
                script += _.template('.where(<%=processedWhereClause%>)\n')({'processedWhereClause': processedWhereClause});
            }

            script += ';\n';
            if (config.where != null) {
                script += 'query.bind(bindArray);\n';
            }
            script += 'var dbPromise = query.exec();\n';
            eval(script);
            dbPromise.then(function (result) {
                deferred.resolve(result);
            })
                .catch(function (exception) {
                    deferred.reject(exception)
                });
        })

        return deferred.promise;
    },


    /************************************************************
     * Helper methods
     ************************************************************/

    convertToClnType: function (turboType) {
        //todo/kn.. bring this assert back later
        // assert.isTrue(!G.isNullEmpty(turboType), "!G.isNullEmpty(turboType)");
        var clnType = null;
        if (turboType == 'String') {
            clnType = 'string';
        } else if (turboType == 'Integer') {
            clnType = 'integer';
        } else if (turboType == 'Decimal') {
            clnType = 'decimal';
        } else if (turboType == 'Boolean') {
            clnType = 'boolean';
        } else if (turboType == 'Date' || turboType == 'Time' || turboType == 'DateTime') {
            clnType = 'date';
        } else {
            clnType = 'string';
        }
        return clnType;
    },


    /**
     * @param columnType
     * @param columnValue
     * @returns the column value in the correct object type
     */
    convertType: function (columnType, columnValue) {
        var self = this;
        if (G.isNullEmpty(columnValue)) {
            return null;
        }

        if (G.isArray(columnValue)) {
            var list = [];
            columnValue.forEach(function (value) {
                list.push(self.convertType(columnType, value))
            })
            return list;
        }

        if (columnType == 'DateTime' && typeof columnValue === 'string') {
            return moment(columnValue, "YYYY-MM-DD HH:mm:ss").toDate();
        } else if (columnType == 'Date' && typeof columnValue === 'string') {
            return moment(columnValue, "YYYY-MM-DD").toDate();
        } else if (columnType == 'Time' && typeof columnValue === 'string') {
            return moment(columnValue, "HH:mm").toDate();
        }
        return columnValue
    },


    /**
     * @param columnType
     * @param columnValue
     * @returns the column value in the correct object type
     */
    convertTypeForWire: function (columnType, columnValue) {
        var self = this;
        if (columnValue == null) {
            return null;
        }

        if (G.isArray(columnValue)) {
            var list = [];
            columnValue.forEach(function (value) {
                list.push(self.convertType(columnType, value))
            })
            return list;
        }

        if (columnType == 'DateTime' && G.isDateObject(columnValue)) {
            return moment(columnValue).format('YYYY-MM-DD HH:mm:ss');
        } else if (columnType == 'Date' && G.isDateObject(columnValue)) {
            return moment(columnValue).format('YYYY-MM-DD');
        } else if (columnType == 'Time' && G.isDateObject(columnValue)) {
            return moment(columnValue).format('HH:mm');
        }
        return columnValue
    },


    /**
     * this method is helpful because sometimes the entityName is in lowercase and is not exactly the same as the entity.name
     * @param entityName.. it could be in lower-case
     * @returns the exact entity name
     */
    exactEntityName: function (entityName) {
        var entity = $$.entityByName(entityName);
        return entity != null ? entity.name : entityName;
    },


    retrieveFieldDetailsLF: function (fieldExpression, entity, aliases, hasJoins) {

        var possibleFunctions = {
            'AVG': 'lf.fn.avg',
            'COUNT': 'lf.fn.count',
            'DISTINCT': 'lf.fn.distinct',
            'GEOMEAN': 'lf.fn.geomean',
            'MAX': 'lf.fn.max',
            'MIN': 'lf.fn.min',
            'STDDEV': 'lf.fn.stddev',
            'SUM': 'lf.fn.sum'
        }

        var feo = DB.fieldExpressionAsObject(fieldExpression, possibleFunctions, entity, aliases);
        assert.isTrue(feo != null, "feo!=null");

        var fieldInQuery = $st(feo.fieldName) == '*' ? '<%=entityName%>.id' : '<%=entityName%>.<%=fieldName%>';
        var fieldAlias = !G.isNullEmpty(feo.fieldAlias) ? feo.fieldAlias : '<%=entityName%>_<%=fieldName%>';

        return {
            entityName: aliases != null && aliases[feo.entityName] != null ? aliases[feo.entityName] : feo.entityName,
            fieldName: feo.fieldName,
            fnc: feo.aggregateFnc,
            asFieldExpression: function () {
                if (feo.aggregateFnc != null) {
                    return _.template('<%=fnc_val%>(' + fieldInQuery + ').as(\'' + fieldAlias + '\')\n')({
                        fnc_key: feo.aggregateFnc.key,
                        fnc_val: feo.aggregateFnc.value,
                        entityName: feo.entityAlias != null ? feo.entityAlias : feo.entityName,
                        fieldName: feo.fieldName,
                        fieldAlias: feo.fieldAlias
                    });
                } else {
                    return _.template(fieldInQuery + '.as(\'' + fieldAlias + '\')\n')({
                        entityName: feo.entityAlias != null ? feo.entityAlias : feo.entityName,
                        fieldName: feo.fieldName,
                        fieldAlias: feo.fieldAlias
                    });
                }
            },
            asGroupByExpression: function () {
                return _.template(fieldInQuery + '\n')({
                    entityName: feo.entityAlias != null ? feo.entityAlias : feo.entityName,
                    fieldName: feo.fieldName
                });
            }
        }
    },


    formatEquationForLF: function (sectionObject, entityName) {
        var equationForLoveField;
        assert.isTrue(!G.isNullEmpty(sectionObject.fieldName), "!G.isNullEmpty(sectionObject.fieldName)");
        // console.log("sectionObject.fieldName: ", sectionObject.fieldName)
        if (sectionObject.fieldName.indexOf(".") == -1) {
            assert.isTrue(!G.isNullEmpty(entityName), "!G.isNullEmpty(entityName)");
            sectionObject.fieldName = entityName + "." + sectionObject.fieldName;
        }
        if (sectionObject.valueName != null && sectionObject.valueName2 != null) {
            equationForLoveField = sectionObject.fieldName + '.' + sectionObject.sign + "(" + sectionObject.valueName + ',' + sectionObject.valueName2 + ")";
        } else if (sectionObject.valueName != null) {
            equationForLoveField = sectionObject.fieldName + '.' + sectionObject.sign + "(" + sectionObject.valueName + ")";
        } else {
            equationForLoveField = sectionObject.fieldName + ' ' + sectionObject.sign;
        }
        if (sectionObject.negated) {
            equationForLoveField = "lf.op.not(" + equationForLoveField + ")";
        }
        return equationForLoveField;
    },


    prepareWhereClauseForLF: function (preparedWhereClauseObject, entityName) {
        var self = this;
        var finalWhereClause = '';
        if (preparedWhereClauseObject.fnc != null) {
            finalWhereClause += "AND" == preparedWhereClauseObject.fnc ? "lf.op.and(" : "lf.op.or(";
            for (var i = 0; i < preparedWhereClauseObject.sections.length; i++) {
                var section = preparedWhereClauseObject.sections[i];
                finalWhereClause += self.prepareWhereClauseForLF(section, entityName);
                if (i != preparedWhereClauseObject.sections.length - 1) {
                    finalWhereClause += ',';
                }
            }
            finalWhereClause += ")";
        } else {
            finalWhereClause += self.formatEquationForLF(preparedWhereClauseObject, entityName);
        }
        return finalWhereClause;
    },


    /**
     * @param field field-name or alias
     * @param sortOrder ASC or DESC
     */
    createOrderByStatementLF: function (field, sortOrder) {
        var orderByStatement;
        if (sortOrder != null && $stu(sortOrder) == "DESC") {
            orderByStatement = ".orderBy(<%=field%>, lf.Order.DESC)";
        } else {
            orderByStatement = ".orderBy(<%=field%>)";
        }
        return _.template(orderByStatement)({field: field});
    }

}

var DB = $.extend(DB, DB_CLN);

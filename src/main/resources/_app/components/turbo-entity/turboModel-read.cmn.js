/**
 * @param modelName <p>name of the model like Student etc..<p>
 * @param criteria
 * <p>array with a list of objects containing a field-name and the respective value
 * in case of a range, the objects have from-value and to-value fields instead<p>
 * @param paginationOptions
 * <p> an object with the following fields:
 * <ul>
 *     <li>pageNumber: which page of the result should be retrieved</li>
 *     <li>pageSize: the size of the pages in the results</li>
 *     <li>sort: the type of sorting, ascending vs descending (obsolete?)</li>
 * </ul>
 * </p>
 * @param sortFields:
 * <p>
 *     a string with the name of the fields for sorting (needs extending)
 * </p>
 * @param parentInfo
 * <p> an object with the following fields:
 * <ul>
 *     <li>parentFieldName:  the name of the foreign key referring to the parent entity</li>
 *     <li>parentName:  the name of the parent entity</li>
 *     <li>parentRelationshipType: type of the relationship like many-to-one, many-to-many etc. </li>
 *     <li>mappedBy: mapped-by field if present (add more details!?)</li>
 *     <li>selectedParentId: the id of the parent object </li>
 * </ul>
 * </p>
 */
var execute = function (modelName, criteria, paginationOptions, sortFields, parentInfo) {

    var self = this;

/*    console.log("modelName: ", modelName, "criteria: ", criteria,
        "paginationOptions: ", paginationOptions, "sortFields: ", sortFields);*/

    var readConfig = {};

    var modelDetails = TM.modelDetails(modelName, true);
    //todo/kn.. check the usages of the key
    var key = modelDetails.key;
    var viewModel = modelDetails.viewModel;

    /**
     * if this is a child table and no parent entity is selected
     */
    if (parentInfo != null && parentInfo.parentName != null && parentInfo.selectedParentId == null) {
        var result = $$.map("metadata", modelDetails, "data", new C.ArrayList(), "totalItems", 0);
        self.resolve(result);
    }

    var fieldList = modelDetails.fields;
    var fieldByNameMap = TM.fieldByNameMap(fieldList);

    /**
     * setting the where statement
     */
    var whereClause = '';
    var whereStatements = [];
    var params = {};
    var criteriaIndex = 0;
    criteria.forEach(function (criteriaItem, index) {
        var fieldName = criteriaItem.name;
        var field = fieldByNameMap[fieldName];
        var like_search = field.props.search_like;
        var range_search = field.props.search_range;
        var fieldValue = criteriaItem.value;
        if (range_search) {
            var fromValue = criteriaItem.fromValue;
            var toValue = criteriaItem.toValue;

            if (!G.isNullEmpty(fromValue)) {
                criteriaIndex++;
                var whereStatement = fieldName + ' ';
                whereStatement += ' >= ';
                whereStatement += ':' + fieldName + '_' + criteriaIndex;
                params[fieldName + '_' + criteriaIndex] = fromValue;
                whereStatements.push(whereStatement);
            }
            if (!G.isNullEmpty(toValue)) {
                criteriaIndex++;
                var whereStatement = fieldName + ' ';
                whereStatement += ' < ';
                whereStatement += ':' + fieldName + '_' + criteriaIndex;
                params[fieldName + '_' + criteriaIndex] = toValue;
                whereStatements.push(whereStatement);
            }

        } else if (!G.isNullEmpty(fieldValue)) {
            criteriaIndex++;
            var whereStatement = fieldName + ' ';
            if (like_search) {
                whereStatement += ' match ';
            } else {
                whereStatement += ' = ';
            }
            whereStatement += ':' + fieldName + '_' + criteriaIndex;
            if (like_search) {
                whereClause.append("%");
            }
            params[fieldName + '_' + criteriaIndex] = like_search ? fieldValue + '%' : fieldValue;
            whereStatements.push(whereStatement);
        }
    })

    /**
     * Setting the fields
     */
    var fieldStatements = [];
    // to be used later
    var leftJoinFields = [];
    G.toArray(fieldList).forEach(function (field) {
        var fieldStatement = '';
        var modelAlias;
        if (G.isNullEmpty(field.modelAlias)) {
            modelAlias = "_this";
        } else {
            modelAlias = field.modelAlias;
        }
        var fieldName = field.name;
        var relationshipType = field.props.rel_type;
        if (fieldName == null && relationshipType != null) {
            fieldName = relationshipType;
        }
        var aliasedFieldname = G.isNullEmpty(field.modelAlias) ? fieldName : modelAlias + '_' + fieldName;

        // in case of a relationship field (many-to-one or the active part of one-to-one relationships)
        if (!G.isNullEmpty(field.props.rel_type)) {
            if (!TM.isReferring(field.props.rel_type, field.props.rel_mappedBy)) {
                return;
            }
            leftJoinFields.push(field);
        }

        fieldStatement += modelAlias + '.' + fieldName + '.' + aliasedFieldname;
        fieldStatements.push(fieldStatement)
    });
    readConfig.fields = fieldStatements;


    /**
     * setting the entity name
     */
    if (!G.isNullEmpty(viewModel)) {
        readConfig.entityName = viewModel;
    } else {
        readConfig.entityName = modelName;
    }


    /**
     * setting the aliases
     */
    var aliases = {};

    /**
     * setting the join statements
     */
    // in case there are any left-join-fields (implicit joins, foreign key fields)
    var joinStatements = [];
    if (viewModel == null) {
        leftJoinFields.forEach(function (leftJoinField) {
            var joinStatement = 'outer:' + '_this.' + leftJoinField.name + '=' + leftJoinField.name;
            aliases[leftJoinField.name] = leftJoinField.props.type;
            joinStatements.push(joinStatement);
        })
    }
    // explicit joins
    else {
        var joins = modelDetails.joins;
        if (!G.isNullEmpty(joins)) {
            joins.forEach(function (join) {
                //todo/kn.. add aliases here
                var joinStatement = 'outer:' + join.joinAlias + '.' + join.field + '=' + join.alias;
                joinStatements.push(joinStatement);
            })
        }
    }

    /**
     * populate alias map
     */
    if (!G.isNullEmpty(viewModel)) {
        aliases[modelName] = viewModel;
        var joins = modelDetails.joins;
        if (!G.isNullEmpty(joins)) {
            //todo/kn.. to be tested
            joins.forEach(function (join) {
                aliases[join.alias] = join.field;
            })
        }
    } else {
        aliases['_this'] = modelName;
    }

    /**
     * setting the skip and limit fields
     */
    if (paginationOptions != null) {
        assert.isNotNull(paginationOptions.pageNumber);
        assert.isNotNull(paginationOptions.pageSize);
        readConfig.skip = (parseInt(paginationOptions.pageNumber) - 1) * parseInt(paginationOptions.pageSize);
        readConfig.limit = parseInt(paginationOptions.pageSize);
    }

    /**
     * if there is a parent for this table join with it
     */
    if (parentInfo != null && parentInfo.parentName != null && parentInfo.selectedParentId != null) {

        if (G.isNullEmpty(parentInfo.parentFieldName)) {
            parentInfo.parentFieldName = S.uncapitalize(parentInfo.parentName);
        }

        // for many-to-many and many-to-one an explicit join and where-clause are necessary
        if (parentInfo.parentRelationshipType != null && (
                parentInfo.parentRelationshipType.toLowerCase() == 'manytomany'
                || TM.isReferring(parentInfo.parentRelationshipType, parentInfo.mappedBy)
            )) {

            aliases['_parent'] = parentInfo.parentName;

            // join statement
            var joinStatement = '_this.' + parentInfo.parentFieldName + '= _parent';
            joinStatements.push(joinStatement);
            // where clause
            var whereStatement = ' _parent.id = :parentId ';
            params['parentId'] = parentInfo.selectedParentId;
            whereStatements.push(whereStatement);
        }
        // todo/kn.. check how this is being used
        // for one-to-many just adjust the where clause
        else {
            var whereStatement = parentInfo.parentFieldName + '.id = :parentFieldName';
            params['parentFieldName'] = parentInfo.selectedParentId;
            whereStatements.push(whereStatement);
        }
    }

    /**
     * setting the order-by
     */
    if (sortFields != null) {
        readConfig.orderBy = sortFields;
    }

    // the following fields are being calculated at multiple places, for this reason they are set at the end
    readConfig.joins = joinStatements;
    readConfig.aliases = aliases;
    var finalWhereStatement = whereStatements.join(' and ');
    readConfig.where = finalWhereStatement;
    readConfig.params = params;

    /**
     * read from the db using the read configuration object
     */
    var dataPromise = DB.read(readConfig);

    /**
     * get a count of all of the available results
     */
    // copy the readConfig and overwrite the necessary fields
    var countConfig = _.extend({}, readConfig);
    countConfig.skip = null;
    countConfig.limit = null;
    countConfig.orderBy = null;
    countConfig.fields = [];
    countConfig.fields.push('count:*.cnt');
    var countPromise = DB.read(countConfig);

    Q.all([dataPromise, countPromise])
        .then(function (results) {
            var data = results[0];
            var count = results[1];
            self.resolve({
                metadata: modelDetails,
                data: data,
                totalItems: count[0].cnt
            })
        });
}


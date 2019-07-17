
var execute = function (model, value) {

    /**
     * find the given model and extract the key
     */
    var modelDetails = TM.modelDetails(model);
    var key = modelDetails.key
    if (key == null || key.trim().equals("")) {
        resolve(null);
    }

    var selectedFields = new C.ArrayList()

    var fieldList = modelDetails.get("fields")
    var fieldsAsQueryString = TM.fieldsAsQueryString(fieldList, selectedFields)
    var fieldByNameMap = TM.fieldByNameMap(fieldList)

    var fields = TM.retrieveCriteriaFields(key)
    if (fields == null || fields.isEmpty()) {
        resolve(null);
    }

    /**
     * Populate the where section
     */
    var selectClause = fieldsAsQueryString;
    var fromClause = " FROM " + modelDetails.name + " _this ";
    var whereClause = new C.StringBuilder();
    var queryParameters = new C.HashMap()
    whereClause.append(" WHERE ");
    var counter = 1;
    for (var itr = fields.iterator(); itr.hasNext();) {
        var field = itr.next();
        whereClause.append(SPACE).append("_this.").append(field)
        whereClause.append(" LIKE ")
        var param = "param" + counter++
        whereClause.append(":").append(param)
        queryParameters.put(param, value + "%")
        if (itr.hasNext()) {
            whereClause.append(" or ")
        }
    }
    var queryString = new C.StringBuilder();
    queryString.append(" SELECT new map(").append(selectClause).append(") ").append(fromClause).append(whereClause);
    var query = session.createQuery(queryString.toString());
    // set the parameters
    for each(queryParameter in queryParameters.keySet()) {
        console.log(queryParameter, queryParameters.get(queryParameter))
        query.setParameter(queryParameter, queryParameters.get(queryParameter))
    }

    var result = query.list()
    var totalItems = 1
    /**
     * return it if there is only one result otherwise i return null
     * a null would then bring up a dialog on the client side to search for this entity with more details
     */
    if (result == null || result.isEmpty() || result.size() > 1) {
        result = null
        totalItems = 0
    }

    var resultAsMap = DB.resultAsMap(modelDetails.name, selectedFields, null, result, key);
    resolve(resultAsMap);

}



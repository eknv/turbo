var execute = function (modelName, columnName, columnType, columnValue, rowId) {

    var self = this;

    console.log("columnValue: ", columnValue)
    console.log("rowId: ", rowId)

    return DB.update(
        {
            entityName: modelName,
            set: columnName + " = :newValue",
            where: "id = :rowId",
            params: {
                newValue: columnValue,
                rowId: rowId
            }
        }
    )
        .then(function (success) {
            self.resolve(success);
        })

}


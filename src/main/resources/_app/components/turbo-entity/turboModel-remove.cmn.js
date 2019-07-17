/**
 *
 * @param modelName
 * @param entityIds
 * @returns todo/kn.. check this
 */
var execute = function (modelName, entityIds) {

    var self = this;

    return DB.delete({
        entityName: modelName,
        where: "id in :ids",
        params: {
            ids: entityIds
        }
    })
        .then(function (result) {
            self.resolve(result);
        })

}


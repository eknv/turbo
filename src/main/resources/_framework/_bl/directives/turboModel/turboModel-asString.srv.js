
//todo/kn.. needs testing
//todo/kn continue here.. convert the queries using the new _db framework
var execute = function (entityType, entityId) {
    return DB.load(entityType, null, [entityId])
        .then(function (entityObject) {
            var modelDetails = TM.modelDetails(entityType)
            var key = modelDetails.key
            console.log('key: ', key)
            var asString = TM.asString(key, entityType, entityObject);
            resolve(asString);
        });
}

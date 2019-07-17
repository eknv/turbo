var execute = function () {

    var entityName = "Address";
    var relatedObjectClass = C.DBC.getClassLoader().loadClass("turbo." + entityName);
    var object = session.load(relatedObjectClass, G.int(1));
    object.city = "city1 (4)";
    var entities = G.asArray(object)
    return DB.saveOrUpdate(entityName, null, entities).then(function (entities) {
        console.log("this is the final result: " + entities)
        resolve(entities);
    });

}


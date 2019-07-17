var execute = function () {

    var relatedObjectClass = C.DBC.getClassLoader().loadClass("turbo.Student");
    var student5 = session.load(relatedObjectClass, G.int(5));
    var relatedObjectClass = C.DBC.getClassLoader().loadClass("turbo.Address");
    var address2621440 = session.load(relatedObjectClass, G.int(2621440));
    student5.address = address2621440;
    return DB.saveOrUpdate("Student", null, student5).then(function (entities) {
        console.log("this is the final result: " + entities)
        resolve(entities);
    });

}


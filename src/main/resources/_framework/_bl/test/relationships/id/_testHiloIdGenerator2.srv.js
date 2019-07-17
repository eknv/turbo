
/**
 * testing the timestamp id generator
 */
var execute = function () {
    var clazz = C.DBC.getClassLoader().loadClass("turbo.tt3");
    var ctor = clazz.getConstructor();
    var object = ctor.newInstance();
    object.name = "first tt3"
    console.log(object)
    session.saveOrUpdate(object)
    console.log(object)
    var loadedObject = session.load(clazz, object.id);
    $$.assertNotNull(loadedObject)
    this.resolve(null);
}


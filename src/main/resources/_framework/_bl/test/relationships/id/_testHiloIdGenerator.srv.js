
/**
 * testing the hilo id generator with the primayKeyValue hi_value
 */
var execute = function () {
    var clazz = C.DBC.getClassLoader().loadClass("turbo.tt1");
    var ctor = clazz.getConstructor();
    var object = ctor.newInstance();
    object.name = "first tt1"
    console.log(object)
    session.saveOrUpdate(object)
    console.log(object)
    var loadedObject = session.load(clazz, object.id);
    $$.assertNotNull(loadedObject)
    this.resolve(null);
}


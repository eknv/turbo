
/**
 * this action insert a new patch entry in the db with the given information
 */
var execute = function (patchName, isBefore, currentDBVersion) {
    console.log(patchName + " " + isBefore + " " + currentDBVersion)
    var clazz = C.DBC.getClassLoader().loadClass("turbo.dbpatch");
    var ctor = clazz.getConstructor();
    var object = ctor.newInstance();
    object.name = patchName;
    object.before = isBefore;
    object.version = currentDBVersion
    object.created_on = C.LocalDateTime.now();
    console.log(object)
    session.saveOrUpdate(object);
    this.resolve(null);
}


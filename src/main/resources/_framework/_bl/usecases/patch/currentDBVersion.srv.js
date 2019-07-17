
/**
 * this action get the current patch version in db
 * if there is no dbversion entry in the db, it creates one and initializes the version to 1
 */
var execute = function () {
    var query = session.createQuery("from turbo.dbversion");
    query.setLockOptions(C.LockOptions.UPGRADE);
    var result = query.list();
    var object = null;
    if (result == null || result.size() == 0) {
        var clazz = C.DBC.getClassLoader().loadClass("turbo.dbversion");
        var ctor = clazz.getConstructor();
        object = ctor.newInstance();
        object.version = 1
        object.modified_on = C.LocalDateTime.now();
        session.saveOrUpdate(object);
    } else {
       object = result[0]
    }
    this.resolve(object.version)
}


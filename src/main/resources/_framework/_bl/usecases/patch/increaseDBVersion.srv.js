
/**
 * this action returns the current patch version in db
 * it also increases that version by one in the db
 */
var execute = function () {

    var query = session.createQuery("from turbo.dbversion");
    query.setLockOptions(C.LockOptions.UPGRADE);
    var result = query.list();
    if (result == null || result.size() == 0) {
        var clazz = C.DBC.getClassLoader().loadClass("turbo." + name);
        var ctor = clazz.getConstructor();
        var object = ctor.newInstance();
        object.version = 1
        object.modified_on = C.LocalDateTime.now()
        session.saveOrUpdate(object);
        this.resolve(1);
    } else {
       var object = result[0];
        var version = object.version;
        object.version = version + 1
        object.modified_on = C.LocalDateTime.now();
        session.saveOrUpdate(object);
        this.resolve(version);
    }
}


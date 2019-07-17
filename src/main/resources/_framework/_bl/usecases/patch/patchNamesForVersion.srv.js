
/**
 * this action get the current patch version in db
 * if there is no dbversion entry in the db, it creates one and initializes the version to 1
 */
var execute = function (version) {
    var results = session.createQuery("from turbo.dbpatch as dbpatch where dbpatch.version = :pVersion")
        .setParameter("pVersion", C.Long.valueOf(version)).list();
    var patchesForVersion = new C.ArrayList()
    if (results != null && !results.isEmpty()) {
        for (var i = 0; i < results.size(); i++) {
            patchesForVersion.add(results[i].name)
        }
    }
    this.resolve(patchesForVersion);
}


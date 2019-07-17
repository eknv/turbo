var requires = ["hibernateDBDiff"];

/**
 * Note that DesignData is not part of the model
 * it is a framework table which is not managed by the modelUtils
 * for this reason, hql queries are used in this action instead of the _db frameework
 */
var execute = function (data) {
    var designDataWithPackage = "com.eknv.turbo.domain.DesignData";
    var versionQuery = session.createQuery("select max(version) from " + designDataWithPackage);
    var version = versionQuery.uniqueResult();
    if (version == null) {
        version = 1;
    } else {
        version++;
    }
    var designData = new C.DesignData();
    designData.data = data;
    designData.version = C.Long.valueOf(version);
    session.saveOrUpdate(designData);

    // build the code
    var modelPackage = 'turbo';
    var modelFolder = C.System.getProperty("java.io.tmpdir") + "dal";
    C.DBC.reloadEntities(data, modelFolder, modelPackage)
    hibernateDBDiff.setDBDifferences()

    this.resolve(modelFolder);
}


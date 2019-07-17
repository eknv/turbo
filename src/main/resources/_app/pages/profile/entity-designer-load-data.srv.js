var execute = function () {
    var DesignData = "com.eknv.turbo.domain.DesignData";
    var User = "com.eknv.turbo.domain.User";

    /**
     * todo/kn.. providing sub-selects wherever possible
     */
    var designDataQuery = session.createQuery("from " + DesignData + " as dd where dd.version in ( select max(version) from " + DesignData + ")");
    var designData = designDataQuery.uniqueResult();

    var userQuery = session.createQuery("from " + User);
    var users = userQuery.list();

    var designDataContent;
    if (designData == null || designData.data == null) {
        designDataContent = "{\"entityViews\":[]}";
    } else {
        designDataContent = designData.data
    }

    var result = {designData: designDataContent, users: users, version: designData != null ? designData.version : 0};
    this.resolve(result);
}


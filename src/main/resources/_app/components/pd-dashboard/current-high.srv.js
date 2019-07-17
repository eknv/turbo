
var execute = function () {
    var currentHigh = null;

    var query = session.createQuery("from com.eknv.turbo.domain.TurboID");
    query.setLockOptions(C.LockOptions.UPGRADE);
    query.setCacheable(false);
    var turboIds = query.list();

    /**
     * create a new entry and save it
     */
    if (G.isNullEmpty(turboIds)) {
        currentHigh = 0;
        var turboID = new C.TurboID();
        turboID.setDummyId(G.int(1));
        turboID.setNextHigh(G.int(1));
        session.saveOrUpdate(turboID);
    } else if (turboIds.size() > 1) {
        $$.runtimeException("There should be just one TurboId entity");
    } else {
        var turboID = turboIds.get(0);
        currentHigh = turboID.getNextHigh();
        turboID.setNextHigh(currentHigh + 1);
        session.saveOrUpdate(turboID);
    }
    session.flush();

    this.resolve(currentHigh);

}


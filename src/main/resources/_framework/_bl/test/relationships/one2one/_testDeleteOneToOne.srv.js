
var execute = function () {

    var tt1 = $$.execute("_testAddOneToOne")
    var tt1Id = tt1.id
    var tt2Id = tt1.tt2.id
    $$.assertNotNull(tt1Id)
    $$.assertNotNull(tt2Id)

    session.delete(tt1)

    var tt2Class = C.DBC.getClassLoader().loadClass("turbo.tt2");
    var tt2 = tt2Class.getConstructor().newInstance();
    var tt2Loaded;
    try {
        tt2Loaded = session.load(tt2Class, tt2Id);
    } catch (e) {}

    $$.assertNull(tt2Loaded)

    this.resolve(null);
}



var execute = function () {

    var tt1 = $$.execute("_testAddOneToMany")
    var tt1Id = tt1.id

    var tt3Id = tt1.tt3s.iterator().next().id
    console.log(tt1Id, tt3Id)
    $$.assertNotNull(tt1Id)
    $$.assertNotNull(tt3Id)

    session.delete(tt1)

    var tt3Class = C.DBC.getClassLoader().loadClass("turbo.tt3");
    var tt3 = tt3Class.getConstructor().newInstance();
    var tt3Loaded;
    try {
        tt3Loaded = session.load(tt3Class, tt3Id);
    } catch (e) {}

    $$.assertNull(tt3Loaded)

    this.resolve(null);

}


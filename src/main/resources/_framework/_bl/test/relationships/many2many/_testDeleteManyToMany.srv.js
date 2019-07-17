
var execute = function () {

    var tt1 = $$.execute("_testAddManyToMany")
    var tt1Id = tt1.id

    var tt4Id = tt1.tt4s.iterator().next().id
    console.log(tt1Id, tt4Id)
    $$.assertNotNull(tt1Id)
    $$.assertNotNull(tt4Id)

    session.delete(tt1)

    var tt4Class = C.DBC.getClassLoader().loadClass("turbo.tt4");
    var tt4 = tt4Class.getConstructor().newInstance();
    var tt4Loaded;
    try {
        tt4Loaded = session.load(tt4Class, tt4Id);
    } catch (e) {}

    $$.assertNull(tt4Loaded)

    this.resolve(null);

}


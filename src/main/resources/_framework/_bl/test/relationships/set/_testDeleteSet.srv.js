
var execute = function () {

    var tt1 = $$.execute("_testAddSet")
    var tt1Id = tt1.id

    var stringsIterator = tt1.strings.iterator()
    stringsIterator.next()
    stringsIterator.remove()

    var integersIterator = tt1.integers.iterator()
    integersIterator.next()
    integersIterator.remove()

    var decimalsIterator = tt1.decimals.iterator()
    decimalsIterator.next()
    decimalsIterator.remove()

    session.saveOrUpdate(tt1)

    var tt1Class = C.DBC.getClassLoader().loadClass("turbo.tt1");
    var tt1Loaded;
    try {
        tt1Loaded = session.load(tt1Class, tt1Id);
    } catch (e) {}

    $$.assertNotNull(tt1Loaded)


    console.log(tt1Loaded.strings.size(), tt1Loaded.integers.size(), tt1Loaded.decimals.size())

    $$.assertTrue(tt1Loaded.strings.size()==2)
    $$.assertTrue(tt1Loaded.integers.size()==2)
    $$.assertTrue(tt1Loaded.decimals.size()==2)

    this.resolve(null);
}


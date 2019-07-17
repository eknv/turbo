
var execute = function () {
    var tt1Class = C.DBC.getClassLoader().loadClass("turbo.tt1");
    var tt1 = tt1Class.getConstructor().newInstance();

    tt1.name = "tt1 with sets"

    tt1.strings.add("first string")
    tt1.strings.add("second string")
    tt1.strings.add("third string")

    tt1.integers.add(G.i(1))
    tt1.integers.add(G.i(2))
    tt1.integers.add(G.i(3))

    tt1.decimals.add(G.d(1.2))
    tt1.decimals.add(G.d(2.3))
    tt1.decimals.add(G.d(3.4))

    session.saveOrUpdate(tt1);
    console.log(tt1)

    var tt1Loaded = session.load(tt1Class, tt1.id);
    $$.assertNotNull(tt1Loaded)

    $$.assertTrue(tt1.strings.size()==3)
    $$.assertTrue(tt1.integers.size()==3)
    $$.assertTrue(tt1.decimals.size()==3)

    this.resolve(tt1);
}


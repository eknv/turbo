
var execute = function () {
    var tt1Class = C.DBC.getClassLoader().loadClass("turbo.tt1");
    var tt1 = tt1Class.getConstructor().newInstance();
    var tt2Class = C.DBC.getClassLoader().loadClass("turbo.tt2");
    var tt2 = tt2Class.getConstructor().newInstance();
    var tt2_2 = tt2Class.getConstructor().newInstance();

    var randomNumber = C.ThreadLocalRandom.current().nextInt(1, 1001);

    tt1.name = "parent" + randomNumber
    tt2.name = "child" + randomNumber
    tt2_2.name = "child_2_" + randomNumber
    tt2.tt1_2 = tt1;
    tt2_2.tt1_2 = tt1;

    tt1.tt2Map.put(tt2.name, tt2)
    tt1.tt2Map.put(tt2_2.name, tt2_2)

    session.saveOrUpdate(tt1);
    console.log(tt1, tt2, tt2_2)

    var tt1Loaded = session.load(tt1Class, tt1.id);
    $$.assertNotNull(tt1Loaded)

    console.log(tt1Loaded)
    $$.assertNotNullEmpty(tt1Loaded.tt2Map)

    this.resolve(tt1);
}



var execute = function () {
    var tt1Class = C.DBC.getClassLoader().loadClass("turbo.tt1");
    var tt1 = tt1Class.getConstructor().newInstance();
    var tt2Class = C.DBC.getClassLoader().loadClass("turbo.tt2");
    var tt2 = tt2Class.getConstructor().newInstance();

    tt2.name = "the owner"
    tt1.name = "tt1 name"
    tt1.tt2 = tt2

    console.log(tt2)
    console.log(tt1)
    session.saveOrUpdate(tt1);
    console.log(tt1, tt2)
    
    var tt2Loaded = session.load(tt2Class, tt2.id);
    $$.assertNotNull(tt2Loaded)

    this.resolve(tt1);
}


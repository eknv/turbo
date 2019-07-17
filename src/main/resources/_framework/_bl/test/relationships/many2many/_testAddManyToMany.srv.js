
var execute = function () {
    var tt1Class = C.DBC.getClassLoader().loadClass("turbo.tt1");
    var tt1 = tt1Class.getConstructor().newInstance();
    var tt4Class = C.DBC.getClassLoader().loadClass("turbo.tt4");
    var tt4 = tt4Class.getConstructor().newInstance();

    //tt1 has many of tt4.. it is a one to many relationship

    tt4.name = "child, many to one"
    tt1.name = "parent, one to many"

    // adding will be done with the following two lines
    tt1.tt4s.add(tt4)
    //tt4.tt1s.add(tt1)

    session.saveOrUpdate(tt1);
    //session.saveOrUpdate(tt4);
    console.log(tt1, tt4)

    var tt4Loaded;
    try {
        tt4Loaded = session.load(tt4Class, tt4.id);
    } catch (e) { }
    $$.assertNotNull(tt4Loaded)

    this.resolve(tt1);
}


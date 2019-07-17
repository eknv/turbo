
var execute = function () {
    var tt1Class = C.DBC.getClassLoader().loadClass("turbo.tt1");
    var tt1 = tt1Class.getConstructor().newInstance();
    var tt3Class = C.DBC.getClassLoader().loadClass("turbo.tt3");
    var tt3 = tt3Class.getConstructor().newInstance();

    //tt1 has many of tt3.. it is a one to many relationship

    tt3.name = "child, many to one"
    tt1.name = "parent, one to many"

    // adding will be done with the following two lines
    tt3.tt1=tt1
    tt1.tt3s.add(tt3)

    session.saveOrUpdate(tt1);
    console.log(tt1, tt3)

    var tt3Loaded = session.load(tt3Class, tt3.id);
    $$.assertNotNull(tt3Loaded)

    this.resolve(tt1);
}


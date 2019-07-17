
var execute = function () {

    // create a tt1 with two childrens in the map
    var tt1 = $$.execute("_testAddOneToManyMapKey")
    var tt1Id = tt1.id
    // make sure there are two entries in the map
    $$.assertTrue(tt1.tt2Map.size()==2)

    // remove the first entry from the map
    var firstKey = tt1.tt2Map.keySet().iterator().next()
    tt1.tt2Map.remove(firstKey)

    // save the object
    session.saveOrUpdate(tt1);

    // load the object again and make sure the number of entries in the map is now 1 (not 2 any longer)
    var tt1Class = C.DBC.getClassLoader().loadClass("turbo.tt1");
    var tt1Loaded = session.load(tt1Class, tt1Id);
    $$.assertNotNull(tt1Loaded)
    $$.assertTrue(tt1Loaded.tt2Map.size()==1)

    this.resolve(null);
}


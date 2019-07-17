
var execute = function (parentType, parentName, parentFieldName, parentId, childName, childFieldName, childId) {


    if (parentType != null && parentType.toLowerCase() == 'manytomany') {
        // load both objects
        var parentClass = C.DBC.getClassLoader().loadClass("turbo." + parentName);
        var parentObject = session.load(parentClass, G.int(parentId));

        var childClass = C.DBC.getClassLoader().loadClass("turbo." + childName);
        var childObject = session.load(childClass, G.int(childId));

        parentObject[childFieldName].remove(childObject)
        childObject[parentFieldName].remove(parentObject)

        session.saveOrUpdate(parentObject);
    } else {
        var childClass = C.DBC.getClassLoader().loadClass("turbo." + childName);
        var childObject = session.load(childClass, G.int(childId));
        if (parentFieldName == null) {
            parentFieldName = C.StringUtils.uncapitalize(parentName)
        }
        childObject[parentFieldName] = null;
        session.saveOrUpdate(childObject);
    }

    resolve(true);
}



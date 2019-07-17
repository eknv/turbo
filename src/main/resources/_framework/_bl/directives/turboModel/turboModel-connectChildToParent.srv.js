
var execute = function (parentType, parentName, parentFieldName, parentId, childName, childFieldName, childId) {

    // load both objects
    var parentClass = C.DBC.getClassLoader().loadClass("turbo." + parentName)
    var parentObject = session.load(parentClass, G.int(parentId))

    var childClass = C.DBC.getClassLoader().loadClass("turbo." + childName)
    var childObject = session.load(childClass, G.int(childId))

    if (parentType != null && parentType.toLowerCase() == 'manytomany') {
        parentObject[childFieldName].add(childObject)
        childObject[parentFieldName].add(parentObject)
        session.saveOrUpdate(parentObject)
    } else {
        if (parentFieldName == null) {
            parentFieldName = C.StringUtils.uncapitalize(parentName)
        }
        childObject[parentFieldName] = parentObject
        session.saveOrUpdate(childObject)
    }

    resolve(true);
}



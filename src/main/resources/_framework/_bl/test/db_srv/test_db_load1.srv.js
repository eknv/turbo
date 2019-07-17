var execute = function () {


    return DB.load("Address", null, [1, 2]).then(function (entities) {
        console.log("this is the first print: " + entities)
        return entities;
    }).then(function (entities) {
        console.log("this is the second print: " + entities)
        return entities;
    }).then(function (entities) {
        console.log("this is the third print: " + entities)
        resolve(entities);
    })

}


var execute = function () {

    var newAddress = {
        city: 'city xxx',
        country: 'country xxx',
        street: 'street xxx',
        number: 123
    };
    return DB.saveOrUpdate("Address", null, newAddress).then(function (entities) {
        console.log("this is the final result: " + entities)
        resolve(entities);
    });

}


var execute = function () {

    var newAddress = [
        {city: 'city xxx', country: 'country xxx', street: 'street xxx', number: 111},
        {city: 'city yyy', country: 'country yyy', street: 'street yyy', number: 222},
        {city: 'city zzz', country: 'country zzz', street: 'street zzz', number: 333}
    ];

    return DB.saveOrUpdate("Address", null, newAddress)
        .then(function (entities) {
            return entities;
        })

        .then(function (entities) {
            console.log("just added entries: " + entities)

            DB.delete(
                {
                    entityName: "Address",
                    where: "number > :nmbr",
                    params: {
                        nmbr: 222
                    }
                }
            )

            resolve(null);

        })


        ;


}


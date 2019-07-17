var execute = function () {

    return DB.read(
        {
            entityName: "Student",
            aliases: {
                std: "Student",
                j2: "job"
            },
            fields: [
                "std.name.sname",
                "sum:std.age.stdAge"
                /*                "count:teacher.age"*/
            ],
            joins: [
                "std.teachers=teacher"
            ],
            where: "teacher.occupationYears > :occupationYears and (std.age < :studentAge or std.age = :studentAge)",
            params: {
                occupationYears: 1,
                studentAge: 200
            },
            skip: 0,
            limit: 100,
            orderBy: "std.name asc"
        }
    )
        .then(function (results) {
            console.log(results)
            resolve(results);
        })

}


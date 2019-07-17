var execute = function () {

    DB.defineSchema({
        entityName: "Credit",
        columns: [
            {name: 'id', type: 'integer', primary: true},
            {name: 'name', type: 'string', mandatory: true}
        ]
    });

    DB.defineSchema({
        entityName: "Teacher",
        columns: [
            {name: 'id', type: 'integer', primary: true},
            {name: 'name', type: 'string', mandatory: true},
            {name: 'age', type: 'integer'},
            {name: 'creditId', type: 'integer', fk: "Credit.id"},
        ]
    });

    DB.defineSchema({
        entityName: "Student",
        columns: [
            {name: 'id', type: 'integer', primary: true},
            {name: 'name', type: 'string', mandatory: true},
            {name: 'age', type: 'integer'},
            {name: 'teacherId', type: 'integer', fk: "Teacher.id"},
        ]
    });


    var students = [
        {id: 1, name: "Student 1", age: 23, teacherId: 3},
        {id: 2, name: "Student 2", age: 24, teacherId: 4},
        {id: 3, name: "Student 2", age: 55, teacherId: 4},
        {id: 4, name: "Student 1", age: 80, teacherId: 4},
    ]
    var teachers = [
        {id: 3, name: "Teacher 1", age: 43},
        {id: 4, name: "Teacher 2", age: 60}
    ]
    var credits = [
        {id: 5, name: "Credit 1"},
        {id: 6, name: "Credit 2"}
    ]

    return DB.saveOrUpdate("Teacher", null, teachers)
        .then(function () {
            return DB.saveOrUpdate("Student", null, students);
        })
        .then(function () {
            return DB.saveOrUpdate("Credit", null, credits);
        })
        .then(function () {
            DB.read(
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
                        "Student.teacherId = Teacher.id"
                    ],
                    where: "Teacher.age > :teacherAge and (std.age > :studentAge or std.age = :studentAge)",
                    params: {
                        teacherAge: 50,
                        studentAge: 24
                    },
                    skip: 0,
                    limit: 100,
                    orderBy: "std.name asc"
                }
            )
                .then(function (results) {
                    console.log(results);
                    resolve(results);
                })
        })

}


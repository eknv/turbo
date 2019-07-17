var execute = function () {

    var self = this;
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

    console.log("saveOrUpdate Teacher...")
    return DB.saveOrUpdate("Teacher", null, teachers)
        .then(function () {
            console.log("saveOrUpdate Student...")
            return DB.saveOrUpdate("Student", null, students);
        })
        .then(function () {
            console.log("saveOrUpdate Credit...")
            return DB.saveOrUpdate("Credit", null, credits);
        })

        .then(function (params) {
            console.log("update Credit...")
            DB.update(
                {
                    entityName: "Student",
                    set: "age = :newAge",
                    where: "age >= :studentAge",
                    params: {
                        studentAge: 24,
                        newAge: 100
                    }
                }
            )

            resolve("xxx")
        })
}


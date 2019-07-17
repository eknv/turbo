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

    return DB.saveOrUpdate("Teacher", null, teachers)
        .then(function () {
            return DB.saveOrUpdate("Student", null, students);
        })
        .then(function () {
            return DB.saveOrUpdate("Credit", null, credits);

            resolve(null);
        })

}



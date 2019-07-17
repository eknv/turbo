
var execute = function () {
    console.log("rename student.name to student.name2")

    var query = session.createSQLQuery("" +
        "ALTER TABLE `student` CHANGE COLUMN `name` `name2` VARCHAR(255) NOT NULL")
    query.executeUpdate()

    this.resolve(null);
}


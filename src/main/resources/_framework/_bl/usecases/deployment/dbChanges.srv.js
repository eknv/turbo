var requires = ["hibernateDBDiff"];

var execute = function () {
    var dbDifferences = hibernateDBDiff.getDbDifferences();
    console.log(dbDifferences);
    this.resolve(dbDifferences);
}

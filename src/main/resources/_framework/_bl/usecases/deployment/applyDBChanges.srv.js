var requires = ["hibernateDBDiff"];

var execute = function (runPatches) {
    var messages = hibernateDBDiff.updateDB(runPatches);
    console.log(messages);
    return messages;
    this.resolve(null);
}

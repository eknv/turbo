var requires = ["actionService"];

/**
 * return a list of the current patches, both before and after
 */
var execute = function () {
    this.resolve(actionService.runBeforePatches());
}


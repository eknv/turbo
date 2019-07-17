var requires = ["actionService"];

/**
 * return a list of the current patches, both before and after
 */
var execute = function (patchName) {
    this.resolve(actionService.runPatch(patchName));
}


var requires = ["actionService"];

/**
 * return a list of the current patches, both before and after
 */
var execute = function () {
    var currentPatchinfo = actionService.getCurrentPatchesInfo();
    this.resolve(currentPatchinfo);
}


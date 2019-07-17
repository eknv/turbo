var requires = ["deployment"];

var execute = function () {
    var config = {}
    config.isReleased = deployment.isReleased();
    config.runTestsOnReload = deployment.runTestsOnReload();
    config.buildOnReload = deployment.buildOnReload();
    this.resolve(config);
}

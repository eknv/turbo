var requires = ["deployment"];

var execute = function (config) {
    console.log(config)
    deployment.setRunTestsOnReload(config.runTestsOnReload)
    deployment.setBuildOnReload(config.buildOnReload);
    this.resolve(null);
}

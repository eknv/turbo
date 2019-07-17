var requires = ["actionService"];

var execute = function () {
    actionService.execute("buildIndex");
    this.resolve(null);
}

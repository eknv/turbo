var requires = ["actionService", "deployment"];

var execute = function (activate) {
    if (activate) {
        if (!deployment.isReleased()) {
            actionService.execute("increaseDBVersion");
            deployment.increaseDBVersion();
            deployment.release();
        } else {
            //todo/kn.. return a message that the system has already released
        }
    } else {
        deployment.goToMaintenanceMode();
    }
    this.resolve(null);
}

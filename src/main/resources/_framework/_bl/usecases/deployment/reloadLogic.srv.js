var requires = ["deployment", "actionService", "hibernateDBDiff"];

var gson = new C.Gson();

//todo/kn.. investigate for deletion
var execute = function () {

    if (!deployment.isProduction()) {

        var executedSuccessfully = true

        try {

            actionService.lockIndex()

            if (deployment.buildOnReload()) {
                console.log("##### Rebuilding resources..")
                mavenResources()
                console.log("##### Taking over the model changes if necessary..")
                // if the models are changed, make a backup and take over the changes
                var currentModelVersion = gson.fromJson(designData, C.Map.class).props.version;
                var generatedModelInputStream = C.DBC.getResourceAsStream("config/models_generated.json");
                var generatedModelVersion = gson.fromJson(new C.InputStreamReader(generatedModelInputStream), C.Map.class).props.version;
                console.log("##### CurrentModelVersion: " + currentModelVersion + ", GeneratedModelVersion: " + generatedModelVersion)
                if (currentModelVersion != generatedModelVersion) {
                    console.log("copying model files")
                    var currentModelPath = new C.File(C.DBC.getResource("config/models.json").getFile());
                    var generatedModelPath = new C.File(C.DBC.getResource("config/models_generated.json").getFile());
                    C.FileUtils.copyFile(generatedModelPath, currentModelPath);
                }
                console.log("##### Reloading entities..")
                C.DBC.reloadEntities()

                /**
                 * reload the current db-version
                 * it is useful for cases where it may have been changed manually in the db
                 */
                var currentDBVersion = actionService.execute("currentDBVersion");
                deployment.setCurrentDBVersion(currentDBVersion);

                console.log("##### Setting the DB differences if existent..")
                hibernateDBDiff.setDBDifferences()

                console.log("##### Building logic indexes..")
                actionService.buildIndex()
            }

            if(deployment.runTestsOnReload()) {
                actionService.runTests()
            }

        } catch (e) {
            executedSuccessfully = false
            $$.runtimeException(e)
        } finally {
            actionService.unlockIndex()
        }

        this.resolve(executedSuccessfully);
    }

    this.resolve(false);
}

var mavenResources = function () {
    var ps=new C.ProcessBuilder("mvn_resources.bat");
    ps.redirectErrorStream(true);
    var pr = ps.start();
    var inputStream = new C.BufferedReader(new C.InputStreamReader(pr.getInputStream()));
    var line;
    while ((line = inputStream.readLine()) != null) {
        console.log(line);
    }
    pr.waitFor();
    inputStream.close();
}


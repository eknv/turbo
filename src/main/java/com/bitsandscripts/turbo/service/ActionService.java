package com.eknv.turbo.service;

import com.eknv.turbo.config.DatabaseConfiguration;
import com.eknv.turbo.domain.DesignData;
import com.eknv.turbo.framework.AbstractAction;
import com.eknv.turbo.framework.Deployment;
import com.eknv.turbo.framework.db.HibernateDBDiff;
import com.eknv.turbo.util.*;
import com.eknv.turbo.web.rest.ActionResource;
import com.coveo.nashorn_modules.FilesystemFolder;
import com.coveo.nashorn_modules.Require;
import groovy.lang.GroovyClassLoader;
import groovy.lang.Script;
import jdk.nashorn.api.scripting.NashornScriptEngine;
import jdk.nashorn.api.scripting.ScriptObjectMirror;
import org.apache.commons.collections.map.HashedMap;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.exception.ExceptionUtils;
import org.apache.commons.lang3.ArrayUtils;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.mime.MultipartEntityBuilder;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.util.EntityUtils;
import org.hibernate.Query;
import org.hibernate.Session;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.bind.RelaxedPropertyResolver;
import org.springframework.context.ApplicationContext;
import org.springframework.context.EnvironmentAware;
import org.springframework.core.env.Environment;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionCallbackWithoutResult;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

import javax.annotation.PostConstruct;
import javax.persistence.EntityManager;
import javax.script.*;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentNavigableMap;
import java.util.concurrent.ConcurrentSkipListMap;


@Service
@Transactional
public class ActionService implements EnvironmentAware {

    private final Logger log = LoggerFactory.getLogger(ActionResource.class);
    private ScriptEngineManager scriptEngineManager = new ScriptEngineManager();
    private ScriptEngine baseScriptEngine;
    private ClassPathSearcher classPathSearcher = new ClassPathSearcher();

    private ConcurrentHashMap<String, ScriptEngine> jsScriptEngines = new ConcurrentHashMap<>();
    private ConcurrentHashMap<String, Script> groovyScripts = new ConcurrentHashMap<>();
    private ConcurrentSkipListMap<String, File> serverScriptPaths = new ConcurrentSkipListMap<>();
    private ConcurrentSkipListMap<String, String> clientScriptPaths = new ConcurrentSkipListMap<>();

    //todo/kn.. introduce the code for cleaning up the currentThreads in the filters
    private ThreadLocal<Boolean> ignoreIndexLock = new ThreadLocal<Boolean>() {
        @Override
        protected Boolean initialValue() {
            return false;
        }
    };
    private Boolean isIndexLocked = false;

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private Deployment deployment;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private ResourcePatternResolver resourceResolver;

    @Autowired
    @Qualifier("transactionManager")
    private PlatformTransactionManager transactionManager;

    @Autowired
    private HibernateDBDiff hibernateDBDiff;

    private RelaxedPropertyResolver propertyResolver;
    private Environment env;

    private String designData;
    public Map<String, Object> globalCache = new HashMap();

    @Override
    public void setEnvironment(Environment env) {
        this.env = env;
        this.propertyResolver = new RelaxedPropertyResolver(env);
    }


    @PostConstruct
    public void init() {

        /**
         * build the index
         */
        buildIndex();

        try {
            reloadLibraries();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        /**
         * Set the current DB version
         * since there is a database call, this code should be transactional
         * since postconstruct methods cannot use the @transactional annotation, it should be programmatically instead
         */
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
        transactionTemplate.execute(new TransactionCallbackWithoutResult() {
            @Override
            protected void doInTransactionWithoutResult(TransactionStatus status) {

                /**
                 * reload entities
                 */
                try {
                    reloadEntities();
                    hibernateDBDiff.setDBDifferences();
                } catch (Exception e) {
                    e.printStackTrace();
                }

                /**
                 * get the current db-version
                 */
                ignoreIndexLockForCurrentThread(true);
                long currentDBVersion = execute("currentDBVersion");
                ignoreIndexLockForCurrentThread(false);
                deployment.setCurrentDBVersion(currentDBVersion);

                /**
                 * todo/kn.. remove later
                 */
                execute("loadEntitiesByName");

                /**
                 * Check whether there are any patches for the current version that are not run yet
                 * if there is any, then go to maintenance mode
                 */
                Map<String, Boolean> currentPatchesInfo = getCurrentPatchesInfo();
                for (Map.Entry<String, Boolean> currentPatchInfo : currentPatchesInfo.entrySet()) {
                    if (!currentPatchInfo.getValue()) {
                        deployment.goToMaintenanceMode();
                        break;
                    }
                }
            }
        });

    }


    /**
     * Reload entities from latest design data
     *
     * @throws Exception
     */
    public void reloadEntities() throws Exception {
        Session session = entityManager.unwrap(Session.class);
        Query query = session.createQuery("from com.eknv.turbo.domain.DesignData order by version DESC");
        query.setMaxResults(1);
        List<DesignData> result = query.list();
        if (!GeneralUtil.isNullOrEmpty(result)) {
            designData = result.get(0).getData();
            DatabaseConfiguration.reloadEntities(designData, DatabaseConfiguration.GENERATED_SOURCE_FOLDER_ROOT, DatabaseConfiguration.MODEL_PACKAGE);
            baseScriptEngine.getBindings(ScriptContext.ENGINE_SCOPE).put("designData", designData);
        }
    }


    /*********************************************************************
     * ********************************************************************
     * Test related methods
     */
    public void runTests() throws Exception {

        for (Map.Entry<String, File> scriptEntry : serverScriptPaths.entrySet()) {
            String scriptName = scriptEntry.getKey();
            File scriptFile = scriptEntry.getValue();

            /**
             * if the script name begins with test, then just run it as a usecase
             */
            if (scriptName.startsWith("_test")) {
                execute(scriptName);
            }
            /**
             * otherwise find all the methods in it that begin with test and run those
             */
            else {

                ScriptEngine scriptEngine = null;
                if (deployment.isProduction()) {
                    scriptEngine = jsScriptEngines.get(scriptName);
                }
                if (scriptEngine == null) {
                    scriptEngine = scriptEngineManager.getEngineByName("nashorn");
                }

                Bindings bindings = scriptEngine.createBindings();
                String relativePath = scriptFile.getAbsolutePath();

                if (deployment.isProduction()) {
                    bindings.put("consoleFileName", serverScriptPaths.get("console").getAbsolutePath());
                    bindings.put("scriptFileName", relativePath);
                    bindings.put("importFileName", serverScriptPaths.get("imports").getAbsolutePath());
                    bindings.put("generalUtilsFileName", serverScriptPaths.get("general-utils").getAbsolutePath());
                    bindings.put("stringUtilsFileName", serverScriptPaths.get("string-utils").getAbsolutePath());
                    bindings.put("modelUtilsFileName", serverScriptPaths.get("model-utils").getAbsolutePath());
                    bindings.put("dbUtilsFileName", serverScriptPaths.get("db-utils").getAbsolutePath());
                    scriptEngine.setBindings(bindings, ScriptContext.ENGINE_SCOPE);
                    /**
                     * load the imports and utilities
                     */
                    eval(scriptEngine, bindings, "load(consoleFileName)");
                    eval(scriptEngine, bindings, "load(importFileName)");
                    eval(scriptEngine, bindings, "load(generalUtilsFileName)");
                    eval(scriptEngine, bindings, "load(stringUtilsFileName)");
                    eval(scriptEngine, bindings, "load(modelUtilsFileName)");
                    eval(scriptEngine, bindings, "load(dbUtilsFileName)");
                    /**
                     * load the actual script
                     */
                    eval(scriptEngine, bindings, "load(scriptFileName)");
                } else {
                    String rootFolderName = "_app";
                    if (relativePath.contains("_framework")) {
                        rootFolderName = "_framework";
                    } else if (!relativePath.contains("_app")) {
                        throw new RuntimeException("Scripts should be placed either in _app or in the _framework folders");
                    }
                    relativePath = relativePath.substring(relativePath.indexOf(rootFolderName + "\\") + (rootFolderName + "\\")
                            .length()).replace("\\", "/").replace(".js", "");
                    bindings.put("scriptFileName", relativePath + ".js");
                    bindings.put("rootFolderName", rootFolderName);
                    scriptEngine.setBindings(bindings, ScriptContext.ENGINE_SCOPE);
                    /**
                     * load the imports and libraries
                     */
                    eval(scriptEngine, bindings, "load('src/main/resources/_framework/_bl/utils/console.js')");
                    eval(scriptEngine, bindings, "load('src/main/resources/_framework/_bl/common/imports.srv.js')");
                    eval(scriptEngine, bindings, "load('src/main/resources/_framework/_bl/utils/db-utils.js')");
                    eval(scriptEngine, bindings, "load('src/main/resources/_framework/_bl/utils/model-utils.srv.js')");
                    eval(scriptEngine, bindings, "load('src/main/resources/_framework/_bl/utils/general-utils.js')");
                    eval(scriptEngine, bindings, "load('src/main/resources/_framework/_bl/utils/string-utils.js')");
                    /**
                     * load the actual script
                     */
                    eval(scriptEngine, bindings, "load('src/main/resources/'+rootFolderName+'/' + scriptFileName)");
                }

                for (Map.Entry<String, Object> bindingEntry : bindings.entrySet()) {
                    String fieldMethodName = bindingEntry.getKey();
                    if (fieldMethodName.startsWith("_test")) {
                        runActionMethod(scriptName, fieldMethodName, false);
                    }
                }
            }
        }
    }


    /*********************************************************************
     *********************************************************************
     * Patch related methods
     */


    /**
     * @return a list of the patches that start with the current patch version
     * the current patch version is retrieved from the deployment object
     * the patch-names are sorted in natural order ascending-ly
     */
    public List<String> getCurrentPatches() {
        String fromKey = "patch-" + deployment.getCurrentDBVersion();
        String toKey = fromKey.substring(0, fromKey.length() - 1) + (char) (fromKey.charAt(fromKey.length() - 1) + 1);
        ConcurrentNavigableMap<String, File> patchFilesMap = serverScriptPaths.subMap(fromKey, toKey);
        List<String> patchNames;
        if (patchFilesMap == null || patchFilesMap.size() == 0) {
            patchNames = new ArrayList<>();
        } else {
            patchNames = new ArrayList(patchFilesMap.keySet());
            Collections.sort(patchNames);
        }
        return patchNames;
    }


    public Map<String, Boolean> getCurrentPatchesInfo() {
        Map<String, Boolean> currentPatchesMap = new HashedMap();
        List<String> currentPatches = getCurrentPatches();
        if (currentPatches == null || currentPatches.isEmpty()) {
            return currentPatchesMap;
        }
        List patchesAlreadyRunForVersion = execute("patchNamesForVersion", deployment.getCurrentDBVersion());
        for (String currentPatch : currentPatches) {
            if (patchesAlreadyRunForVersion.contains(currentPatch)) {
                currentPatchesMap.put(currentPatch, true);
            } else {
                currentPatchesMap.put(currentPatch, false);
            }
        }
        return currentPatchesMap;
    }


    private void executePatch(String patchName, Boolean isBefore, Long currentDBVersion) {
        runActionMethod(patchName, "execute_in_promise", true);
        execute("insertPatch", patchName, isBefore, currentDBVersion);
    }


    public boolean runBeforePatches() {
        List<String> currentPatches = getCurrentPatches();
        if (currentPatches == null || currentPatches.isEmpty()) {
            return false;
        }
        boolean arePatchesRun = false;
        /**
         * get a list of the patches that are run for this patch-version
         */
        List patchesAlreadyRunForVersion = execute("patchNamesForVersion", deployment.getCurrentDBVersion());
        for (String currentPatch : currentPatches) {
            /**
             * it is a before-patch and it has not run yet for the current patch-version
             */
            if (currentPatch.contains("-before")
                    && (patchesAlreadyRunForVersion == null || !patchesAlreadyRunForVersion.contains(currentPatch))) {
                executePatch(currentPatch, true, deployment.getCurrentDBVersion());
                arePatchesRun = true;
            }
        }
        return arePatchesRun;
    }


    public boolean runPatch(String patchName) {
        List<String> currentPatches = getCurrentPatches();
        if (currentPatches == null || currentPatches.isEmpty()) {
            return false;
        }
        boolean isPatchRun = false;
        List patchesAlreadyRunForVersion = execute("patchNamesForVersion", deployment.getCurrentDBVersion());
        if (patchesAlreadyRunForVersion == null || !patchesAlreadyRunForVersion.contains(patchName)) {
            executePatch(patchName, true, deployment.getCurrentDBVersion());
            isPatchRun = true;
        }
        return isPatchRun;
    }


    public boolean runAfterPatches() {
        List<String> currentPatches = getCurrentPatches();
        if (currentPatches == null || currentPatches.isEmpty()) {
            return false;
        }
        boolean arePatchesRun = false;
        /**
         * get a list of the patches that are run for this patch-version
         */
        List patchNamesForVersion = execute("patchNamesForVersion", deployment.getCurrentDBVersion());
        for (String currentPatch : currentPatches) {
            /**
             * it is an after-patch and it has not run yet for the current patch-version
             */
            if (currentPatch.contains("-after")
                    && (patchNamesForVersion == null || !patchNamesForVersion.contains(currentPatch))) {
                executePatch(currentPatch, false, deployment.getCurrentDBVersion());
                arePatchesRun = true;
            }
        }
        return arePatchesRun;
    }


    /*********************************************************************
     * *********************************************************************
     * Index Lock related methods
     */


    public Boolean shouldIgnoreIndexLockForCurrentThread() {
        return ignoreIndexLock.get();
    }

    public void ignoreIndexLockForCurrentThread(Boolean ignore) {
        this.ignoreIndexLock.set(ignore);
    }

    public void lockIndex() {
        synchronized (isIndexLocked) {
            isIndexLocked = true;
        }
        ignoreIndexLockForCurrentThread(true);
    }

    public void unlockIndex() {
        synchronized (isIndexLocked) {
            isIndexLocked = false;
        }
        ignoreIndexLockForCurrentThread(false);
    }


    /*********************************************************************
     * *********************************************************************
     * Index related methods
     */

    /**
     * rebuild the index
     */
    public void buildIndex() {
        if (deployment.isProduction()) {
            buildIndex(null);
        } else {
            buildIndexForDebug();
        }
    }


    /**
     * todo/kn.. this method has been refactored but not tested since.. needs testing
     *
     * @param jarFile
     */
    public void buildIndex(File jarFile) {
        try {
            String fileNamePattern = "(.)*(_app|_framework|app)/(.)*.(js|JS|groovy|GROOVY)";

            Map<String, InputStream> foundFiles;

            if (jarFile == null) {
                foundFiles = classPathSearcher.findFilesInClassPath(fileNamePattern);
            } else {
                foundFiles = classPathSearcher.findResourceInFile(jarFile, fileNamePattern);
            }

            File jsLibraryFolder = new File(System.getProperty("java.io.tmpdir") + File.separator + "jsLibrary");
            FileUtils.deleteDirectory(jsLibraryFolder);
            jsLibraryFolder.mkdirs();

            for (Map.Entry<String, InputStream> resourceEntrySet : foundFiles.entrySet()) {
                String resourceFullPath = resourceEntrySet.getKey();
                String shortName = resourceFullPath.substring(resourceFullPath.lastIndexOf("/") + 1);
                String fileNameWithoutExtension = shortName.substring(0, shortName.lastIndexOf("."));
                /**
                 * add the server and client side scripts and also those in common to the list of the scripts
                 */
                if (fileNameWithoutExtension.endsWith(".srv") || fileNameWithoutExtension.endsWith(".cmn")) {
                    InputStream inputStream = resourceEntrySet.getValue();
                    File outputFile = new File(jsLibraryFolder.getAbsolutePath() + File.separator + shortName);
                    PrintWriter writer = new PrintWriter(outputFile.getAbsoluteFile(), "UTF-8");
                    IOUtils.copy(inputStream, writer);
                    writer.flush();
                    writer.close();
                    serverScriptPaths.put(fileNameWithoutExtension.replace(".srv", "").replace("srv_", ""), outputFile);
                }
                if (fileNameWithoutExtension.endsWith(".cln") || fileNameWithoutExtension.endsWith(".cmn")) {
                    //todo/kn.. the path for the client side should be adjusted
                    clientScriptPaths.put(fileNameWithoutExtension.replace(".srv", "").replace("srv_", ""),
                            jsLibraryFolder.getAbsolutePath() + File.separator + shortName);
                }
            }

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException(e);
        }
    }

    private void buildIndexForDebug() {

    /*String appDirectory = System.getProperty("user.dir") + File.separator + "app";
    System.out.println(appDirectory);

    try {
      Files.walk(Paths.get(appDirectory))
        .filter(path -> {
          String fileName = path.getFileName().toString();
          return (Files.isRegularFile(path)
            && ((fileName.startsWith("srv_") && fileName.endsWith(".js"))
            || fileName.endsWith(".srv.js")
            || fileName.endsWith(".groovy")));
        })
        .forEach(path -> {
          String fileName = path.getFileName().toString();
          serverScriptPaths.put(fileName.replace("srv_", "").replace(".srv.js", "").replace(".js", "").replace(".groovy", ""), path.toFile());
        });
    } catch (IOException e) {
      e.printStackTrace();
      throw new RuntimeException(e);
    }

    System.out.println(serverScriptPaths);*/

        try {
            serverScriptPaths.clear();
            clientScriptPaths.clear();
            jsScriptEngines.clear();

            Resource[] logicResources = ArrayUtils.addAll(
                    ArrayUtils.addAll(resourceResolver.getResources("classpath:_app/**"),
                            resourceResolver.getResources("classpath:_framework/_bl/**")));

            for (Resource resource : logicResources) {
                String fileName = resource.getFilename();
                // the naming should be match.. either start with srv_ or end with .srv
                if (fileName.endsWith(".srv.js") || fileName.endsWith(".cmn.js") || fileName.endsWith(".groovy")) {
                    serverScriptPaths.put(fileName.replace(".srv.js", "").replace(".cmn.js", "").replace(".groovy", ""), resource.getFile());
                }
                if (fileName.endsWith(".cln.js") || fileName.endsWith(".cmn.js")) {
                    String relativePath = resource.getFile().getAbsolutePath().replaceAll("\\\\", "/");
                    if (relativePath.contains("_app")) {
                        relativePath = resource.getFile().getAbsolutePath().replaceAll("\\\\", "/");
                        relativePath = relativePath.substring(relativePath.indexOf("_app"));
                    } else if (relativePath.contains("_framework")) {
                        relativePath = resource.getFile().getAbsolutePath().replaceAll("\\\\", "/");
                        relativePath = relativePath.substring(relativePath.indexOf("_framework"));
                    } else {
                        throw new RuntimeException("The source file is out of the predetermined folders: " + relativePath);
                    }
                    clientScriptPaths.put(fileName.replace(".cln.js", "").replace(".cmn.js", ""), relativePath);
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
            throw new RuntimeException(e);
        }

    }


    /*********************************************************************
     * ********************************************************************
     * execute methods
     */


    public <T> T execute(String actionName, Object... params) {
        return runActionMethod(actionName, "execute_in_promise", false, params);
    }

    public <T> T executePublic(String actionName, Object... params) {
        return runActionMethod(actionName + "Public", "execute_in_promise", false, params);
    }

    public <T> T runUtilityMethod(String utilName, String methodName, Object... params) {
        return runActionMethod(utilName, methodName, false, params);
    }

    private <T> T runActionMethod(String actionName, String methodName, boolean isPatchMode, Object... params) {
        Date startTime = new Date();

        /**
         * Set the correct class loader upon very first server call
         */
        if (deployment.isJustStarted()) {
            DatabaseConfiguration.getClassLoader();
            deployment.setJustStarted(false);
        }

        //todo/kn.. consider solving this using CountDownLatch or something similar
        while (isIndexLocked && !shouldIgnoreIndexLockForCurrentThread()) {
            //todo/kn.. if an action is being called from another action and the server goes to maintenance mode in-between, then an exception should be thrown
            // this distinction should be made for integrity reasons
            //throw new RuntimeException("The Server is currently in maintenance mode, please try again later!");
            try {
                Thread.sleep(500);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
            }
        }

        T result;

        if (actionName.startsWith("patch-") && !isPatchMode) {
            throw new RuntimeException("Patches are allowed to run just in patch-mode!");
        }

        File file = serverScriptPaths.get(actionName);

        if (file != null && file.getName().toLowerCase().endsWith(".js")) {
            result = executeJS(actionName, methodName, params);
        } else if (file != null && file.getName().toLowerCase().endsWith(".groovy")) {
            result = executeG(actionName, methodName, params);
        } else {
            result = executeJ(actionName, params);
        }
        log.error(String.format("\n\n\t => The action '%s' was executed in %d milliseconds.\n"
                , actionName, (new Date().getTime() - startTime.getTime())));
        return result;
    }

    private <T> T executeJ(String actionName, Object... arguments) {
        AbstractAction action = getBean(actionName);
        return executeJ(action, arguments);
    }

    private <T> T executeJ(AbstractAction action, Object... params) {
        action.setActionService(this);
        T result = null;
        try {
            result = action.execute(params);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    private <T> T executeJS(String actionName, String methodName, Object... params) {
        if (serverScriptPaths.get(actionName) == null) {
            throw new RuntimeException("Action does not exist!");
        }

        System.out.println("###############################: '" + actionName + "' started");
        Bindings bindings = baseScriptEngine.createBindings();
        bindings.putAll(baseScriptEngine.getBindings(ScriptContext.ENGINE_SCOPE));

        String relativePath = serverScriptPaths.get(actionName).getAbsolutePath();

        if (deployment.isProduction()) {
            bindings.put("session", entityManager.unwrap(Session.class));
            eval(baseScriptEngine, bindings, "load(promiseUtilsFileName)");
            eval(baseScriptEngine, bindings, "load(scriptFileName)");
        } else {
            String rootFolderName = "_app";
            if (relativePath.contains("_framework")) {
                rootFolderName = "_framework";
            } else if (!relativePath.contains("_app")) {
                throw new RuntimeException("Scripts should be placed either in _app or in the _framework folders");
            }
            relativePath = relativePath.substring(relativePath.indexOf(rootFolderName + "\\") + (rootFolderName + "\\")
                    .length()).replace("\\", "/").replace(".js", "");
            bindings.put("scriptFileName", relativePath + ".js");
            bindings.put("rootFolderName", rootFolderName);
            bindings.put("session", entityManager.unwrap(Session.class));

            //todo/kn.. promise-utils is stateful, make sure its binding is not cached
            eval(baseScriptEngine, bindings, "load('src/main/resources/_framework/_bl/utils/promise-utils.srv.js')");
            eval(baseScriptEngine, bindings, "load('src/main/resources/_framework/_bl/utils/db.srv.js')");
            /**
             * load the actual script
             * todo/kn.. keep track whether a script has already been loaded, so that it does not get loaded again
             */
            eval(baseScriptEngine, bindings, "load('src/main/resources/'+rootFolderName+'/' + scriptFileName)");
        }

        ScriptObjectMirror requires = (ScriptObjectMirror) bindings.get("requires");
        if (requires != null && requires.values() != null) {
            for (Object o : requires.values()) {
                String key = (String) o;
                bindings.put(key, getBean(key));
            }
        }

        if (deployment.isProduction()) {
            jsScriptEngines.put(actionName, baseScriptEngine);
        }

        ScriptObjectMirror requiresNew = (ScriptObjectMirror) bindings.get("requiresNew");
        if (requiresNew != null && requiresNew.values() != null) {
            for (Object o : requiresNew.values()) {
                String key = (String) o;
                try {
                    bindings.put(key, getBeanPrototype(key));
                } catch (Exception e) {
                    bindings.put(key, null);
                }
            }
        }

        bindings.put("params", params);
        eval(baseScriptEngine, bindings, "load('src/main/resources/_framework/_bl/utils/executer.srv.js')");
        T result = (T) bindings.get("returnValueX");

        System.out.println("###############################: '" + actionName + "' finished");
        return result;
    }


    public void reloadLibraries() throws Exception {
        baseScriptEngine = scriptEngineManager.getEngineByName("nashorn");
        /**
         * provide support for require-js
         */
        Require.enable((NashornScriptEngine) baseScriptEngine,
                FilesystemFolder.create(new File("C:\\Users\\eknv\\AppData\\Roaming\\npm"), "UTF-8"));
        /**
         * Prepare the bindings
         */
        baseScriptEngine.getBindings(ScriptContext.ENGINE_SCOPE).put("$$", this);
        baseScriptEngine.getBindings(ScriptContext.ENGINE_SCOPE).put("dateUtil", DateUtil.INSTANCE);
        baseScriptEngine.getBindings(ScriptContext.ENGINE_SCOPE).put("ERROR", Constants.ERROR);
        baseScriptEngine.getBindings(ScriptContext.ENGINE_SCOPE).put("SPACE", Constants.SPACE);
        baseScriptEngine.getBindings(ScriptContext.ENGINE_SCOPE).put("COMMA", Constants.COMMA);
        baseScriptEngine.getBindings(ScriptContext.ENGINE_SCOPE).put("clientScriptPaths", clientScriptPaths);
        Runnable emptyRunnable = () -> {
        };
        baseScriptEngine.getBindings(ScriptContext.ENGINE_SCOPE).put("emptyRunnable", emptyRunnable);
        if (deployment.isProduction()) {
            baseScriptEngine.getBindings(ScriptContext.ENGINE_SCOPE).put("consoleFileName", serverScriptPaths.get("console").getAbsolutePath());
            baseScriptEngine.getBindings(ScriptContext.ENGINE_SCOPE).put("importFileName", serverScriptPaths.get("imports").getAbsolutePath());
            baseScriptEngine.getBindings(ScriptContext.ENGINE_SCOPE).put("modelUtilsFileName", serverScriptPaths.get("model-utils").getAbsolutePath());
            baseScriptEngine.getBindings(ScriptContext.ENGINE_SCOPE).put("dbUtilsFileName", serverScriptPaths.get("db-utils").getAbsolutePath());
            baseScriptEngine.getBindings(ScriptContext.ENGINE_SCOPE).put("generalUtilsFileName", serverScriptPaths.get("general-utils").getAbsolutePath());
            baseScriptEngine.getBindings(ScriptContext.ENGINE_SCOPE).put("stringUtilsFileName", serverScriptPaths.get("string-utils").getAbsolutePath());
        } else {
            String rootFolderName = "_app";
            baseScriptEngine.getBindings(ScriptContext.ENGINE_SCOPE).put("rootFolderName", rootFolderName);
        }
        baseScriptEngine.getBindings(ScriptContext.ENGINE_SCOPE).put("designData", designData);

        /**
         * load the base scripts
         */
        if (deployment.isProduction()) {
            eval(baseScriptEngine, null, "load(consoleFileName)");
            eval(baseScriptEngine, null, "load(importFileName)");
            eval(baseScriptEngine, null, "load(generalUtilsFileName)");
            eval(baseScriptEngine, null, "load(stringUtilsFileName)");
            eval(baseScriptEngine, null, "load(modelUtilsFileName)");
            eval(baseScriptEngine, null, "load(dbUtilsFileName)");
        } else {
            eval(baseScriptEngine, null, "load('src/main/resources/_framework/_bl/utils/console.js')");
            eval(baseScriptEngine, null, "load('src/main/resources/_framework/_bl/common/imports.srv.js')");
            eval(baseScriptEngine, null, "load('src/main/resources/_framework/_bl/utils/requires.js')");
            eval(baseScriptEngine, null, "load('src/main/resources/imports/xregexp/xregexp-all.js')");
            eval(baseScriptEngine, null, "load('src/main/resources/_framework/_bl/utils/general-utils.js')");
            eval(baseScriptEngine, null, "load('src/main/resources/_framework/_bl/utils/string-utils.js')");
            eval(baseScriptEngine, null, "load('src/main/resources/_framework/_bl/utils/db-utils.js')");
            eval(baseScriptEngine, null, "load('src/main/resources/_framework/_bl/utils/model-utils.srv.js')");
        }
    }


    private void eval(ScriptEngine scriptEngine, Bindings bindings, String statement) {
        assertNotNull(scriptEngine, "scriptEngine cannot be null");
        assertNotNull(statement, "Evaluation statement cannot be null");
        try {
            if (bindings != null) {
                scriptEngine.eval(statement, bindings);
            } else {
                scriptEngine.eval(statement);
            }
        } catch (ScriptException e) {
            throw new RuntimeException("There was a problem evaluating the following statement " + statement, e);
        }
    }


    private <T> T executeG(String actionName, String methodName, Object... params) {

        T result = null;

        File file = serverScriptPaths.get(actionName);
        if (file == null) {
            throw new RuntimeException("Action is not supported!");
        }

        Script script = null;
        if (deployment.isProduction()) {
            script = groovyScripts.get(actionName);
        }

        if (script == null) {
            try {
                ClassLoader parent = getClass().getClassLoader();
                GroovyClassLoader loader = new GroovyClassLoader(parent);
                Class groovyClass = loader.parseClass(file);
                script = (Script) groovyClass.newInstance();
                List<String> requires = (List) getProperty(script, "requires");
                if (requires != null) {
                    for (String require : requires) {
                        script.setProperty(require, getBean(require));
                    }
                }
                script.setProperty("$$", this);
                script.setProperty("dateUtil", DateUtil.INSTANCE);

                if (deployment.isProduction()) {
                    groovyScripts.put(actionName, script);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        if (script != null) {
            List<String> requiresNew = (List) getProperty(script, "requiresNew");
            if (requiresNew != null) {
                for (String require : requiresNew) {
                    try {
                        if ("session".equals(require.toLowerCase())) {
                            script.setProperty(require, entityManager.unwrap(Session.class));
                        } else {
                            script.setProperty(require, getBeanPrototype(require));
                        }
                    } catch (Exception e) {
                        script.setProperty(require, null);
                    }
                }
            }
            result = (T) script.invokeMethod(methodName, params);
        }

        return result;
    }


    /*********************************************************************
     * ********************************************************************
     * Assert methods
     */
    public void assertTrue(boolean isTrue, String... message) {
        if (!isTrue) {
            throw new RuntimeException(!GeneralUtil.isNullOrEmpty(message) ? message[0] : "Assert Logic failed!");
        }
    }

    public void assertFalse(boolean isFalse, String... message) {
        if (isFalse) {
            throw new RuntimeException(!GeneralUtil.isNullOrEmpty(message) ? message[0] : "Assert Logic failed!");
        }
    }

    public void assertNotNull(Object object, String... message) {
        if (isNull(object)) {
            throw new RuntimeException(!GeneralUtil.isNullOrEmpty(message) ? message[0] : "Assert Logic failed!");
        }
    }

    public void assertNull(Object object, String... message) {
        if (!isNull(object)) {
            throw new RuntimeException(!GeneralUtil.isNullOrEmpty(message) ? message[0] : "Assert Logic failed!");
        }
    }

    public void assertNotNullEmpty(Collection collection, String... message) {
        if (isNull(collection) || collection.isEmpty()) {
            throw new RuntimeException(!GeneralUtil.isNullOrEmpty(message) ? message[0] : "Assert Logic failed!");
        }
    }

    public void assertNullEmpty(Collection collection, String... message) {
        if (!isNull(collection) || !collection.isEmpty()) {
            throw new RuntimeException(!GeneralUtil.isNullOrEmpty(message) ? message[0] : "Assert Logic failed!");
        }
    }

    public void assertNotNullEmpty(Map map, String... message) {
        if (isNull(map) || map.isEmpty()) {
            throw new RuntimeException(!GeneralUtil.isNullOrEmpty(message) ? message[0] : "Assert Logic failed!");
        }
    }

    public void assertNullEmpty(Map map, String... message) {
        if (!isNull(map) || !map.isEmpty()) {
            throw new RuntimeException(!GeneralUtil.isNullOrEmpty(message) ? message[0] : "Assert Logic failed!");
        }
    }

    public boolean isNull(Object object) {
        return GeneralUtil.isNull(object);
    }

    public boolean isNullEmpty(Object object) {
        return GeneralUtil.isNullOrEmpty(object);
    }

    public boolean isCollection(Object object) {
        return GeneralUtil.isCollection(object);
    }

    public boolean isArray(Object obj) {
        return GeneralUtil.isArray(obj);
    }

    public boolean isJSObject(Object object) {
        return GeneralUtil.isJSObject(object);
    }

    public boolean isException(Object object) {
        return GeneralUtil.isException(object);
    }

    public String exceptionMessage(Object object) {
        if (object instanceof Throwable) {
            return ExceptionUtils.getRootCauseMessage((Throwable) object);
        } else {
            return null;
        }
    }

    /*********************************************************************
     * ********************************************************************
     * Utility methods
     * todo/kn.. load these scripts like the imports.js so that the methods are available immediately
     * todo/kn.. look out then for the conflicts
     */

    public Object dbUtils(String methodName, Object... params) {
        return runUtilityMethod("db-utils", methodName, params);
    }

    public Object generalUtils(String methodName, Object... params) {
        return runUtilityMethod("general-utils", methodName, params);
    }

    public Object modelUtils(String methodName, Object... params) {
        return runUtilityMethod("model-utils", methodName, params);
    }

    public Object stringUtils(String methodName, Object... params) {
        return runUtilityMethod("stringUtils", methodName, params);
    }

    public Object map(Object... objects) {
        if (objects.length % 2 != 0) {
            throw new RuntimeException("Number of objects should be even!");
        }
        Map map = new HashMap<>();
        for (Iterator it = Arrays.asList(objects).iterator(); it.hasNext(); ) {
            map.put(it.next(), it.next());
        }
        return map;
    }


    private Object getProperty(Script script, String propertyName) {
        try {
            return script.getProperty(propertyName);
        } catch (Exception e) {
        }
        return null;
    }

    private File exportApplicationLogic() throws Exception {
        File jarOutputFile = File.createTempFile("appFiles", ".jar");
        FileUtil.createJarFile("_app/(.)*.(js|JS|groovy|GROOVY)", jarOutputFile.getAbsolutePath());

        sendFile(jarOutputFile);

        return jarOutputFile;
    }


    private void sendFile(File file) throws Exception {

        String url = "http://127.0.0.1:8080/trainer/api/upload";

        HttpClient httpClient = HttpClientBuilder.create().build();
        HttpPost httpPost = new HttpPost(url);

        HttpEntity httpEntity = MultipartEntityBuilder.create()
                .addBinaryBody("file", file, ContentType.create("application/x-jar"), file.getName())
                .build();

        httpPost.setEntity(httpEntity);
        HttpResponse response = httpClient.execute(httpPost);
        HttpEntity resultEntity = response.getEntity();

        System.out.println(response.getStatusLine());
        if (resultEntity != null) {
            System.out.println(EntityUtils.toString(resultEntity));
        }
        if (resultEntity != null) {
            resultEntity.consumeContent();
        }

        httpClient.getConnectionManager().shutdown();
    }


    /**
     * @param exception optional exception to be rethrown
     * @param message   if a message is passed, it will be passed to the runtime-exception,
     *                  otherwise a standard text will be displayed
     */
    public void runtimeException(Exception exception, String... message) {
        String actualMessage = !GeneralUtil.isNullOrEmpty(message) ? message[0]
                : "Runtime Exception is thrown INTENTIONALLY!";
        if (exception != null) {
            throw new RuntimeException(exception.getMessage(), exception);
        } else {
            throw new RuntimeException(actualMessage);
        }
    }


    /**
     * @param message if a message is passed, it will be passed to the runtime-exception,
     *                otherwise a standard text will be displayed
     */
    public void runtimeException(String... message) {
        runtimeException(null, message);
    }


    public <T> boolean isInstanceof(Object o, Class<T> clazz) {
        assertNotNull(o, "object cannot be null");
        assertNotNull(clazz, "clazz cannot be null");
        return clazz.isAssignableFrom(o.getClass());
    }


    /*********************************************************************
     * ********************************************************************
     * Bean related methods
     */

    private <T> T getBeanPrototype(Class clazz) {
        String beanName = StringUtils.uncapitalize(clazz.getSimpleName());
        if (!applicationContext.isPrototype(beanName)) {
            throw new RuntimeException();
        }
        return (T) applicationContext.getBean(beanName);
    }

    private <T> T getBeanPrototype(String simpleClassName) {
        String beanName = StringUtils.uncapitalize(simpleClassName);
        if (!applicationContext.isPrototype(beanName)) {
            throw new RuntimeException();
        }
        return (T) applicationContext.getBean(beanName);
    }

    private <T> T getBean(Class clazz) {
        String beanName = StringUtils.uncapitalize(clazz.getSimpleName());
        if (!applicationContext.isSingleton(beanName)) {
            throw new RuntimeException();
        }
        return (T) applicationContext.getBean(beanName);
    }

    private <T> T getBean(String simpleClassName) {
        String beanName = StringUtils.uncapitalize(simpleClassName);
        if (!applicationContext.isSingleton(beanName)) {
            throw new RuntimeException();
        }
        return (T) applicationContext.getBean(beanName);
    }

}

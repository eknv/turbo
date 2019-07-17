package com.eknv.turbo.config;

import com.eknv.turbo.Application;
import com.eknv.turbo.config.persistence.ReflectionsPersistenceUnitPostProcessor;
import com.eknv.turbo.framework.freemarker.ConstraintTypeMethod;
import com.eknv.turbo.framework.freemarker.RelationMethod;
import com.eknv.turbo.util.ClassFinder;
import com.eknv.turbo.util.Constants;
import com.eknv.turbo.util.FileUtil;
import com.eknv.turbo.util.GeneralUtil;
import com.codahale.metrics.MetricRegistry;
import com.google.gson.Gson;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import freemarker.template.Template;
import freemarker.template.TemplateExceptionHandler;
import freemarker.template.Version;
import liquibase.integration.spring.SpringLiquibase;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.apache.http.annotation.Obsolete;
import org.hibernate.jpa.HibernatePersistenceProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingClass;
import org.springframework.boot.bind.RelaxedPropertyResolver;
import org.springframework.context.ApplicationContextException;
import org.springframework.context.EnvironmentAware;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import javax.sql.DataSource;
import javax.tools.*;
import java.io.*;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.Charset;
import java.util.*;

import static com.eknv.turbo.framework.Deployment.RELOAD_ENTITIES;

@Configuration
@EnableJpaRepositories("com.eknv.turbo.repository")
@EnableJpaAuditing(auditorAwareRef = "springSecurityAuditorAware")
@EnableTransactionManagement
public class DatabaseConfiguration implements EnvironmentAware {

    private final Logger log = LoggerFactory.getLogger(DatabaseConfiguration.class);

    @Autowired(required = false)
    private MetricRegistry metricRegistry;

    private RelaxedPropertyResolver propertyResolver;
    private Environment env;

    private static freemarker.template.Configuration freeMarker;
    private static ClassLoader classLoader;
    private static ClassLoader resourceLoader;
    private static LocalContainerEntityManagerFactoryBean localContainerEntityManagerFactoryBean;
    public static String GENERATED_SOURCE_FOLDER_ROOT = System.getProperty("java.io.tmpdir") + "dal";
    public static String MODEL_PACKAGE = "turbo";
    private static String HARDCODED_MODEL_PACKAGE = "com.eknv.turbo.domain";


    @Override
    public void setEnvironment(Environment env) {
        this.env = env;
        this.propertyResolver = new RelaxedPropertyResolver(env, "spring.datasource.");
    }

    @Bean
    public LocalContainerEntityManagerFactoryBean entityManagerFactory() {
        /**
         * set resource class-loader
         */
        setResourceLoader(GENERATED_SOURCE_FOLDER_ROOT);
        /**
         * set entity class-loader (main)
         */
        getClassLoader(GENERATED_SOURCE_FOLDER_ROOT);

        initializeFreeMaker();

        localContainerEntityManagerFactoryBean = new LocalContainerEntityManagerFactoryBean();
        localContainerEntityManagerFactoryBean.setBeanClassLoader(getClassLoader());
        String[] packages = new String[]{MODEL_PACKAGE, HARDCODED_MODEL_PACKAGE};
        ReflectionsPersistenceUnitPostProcessor reflectionsPersistenceUnitPostProcessor
                = new ReflectionsPersistenceUnitPostProcessor(Arrays.asList(packages));
        localContainerEntityManagerFactoryBean.setPersistenceUnitPostProcessors(reflectionsPersistenceUnitPostProcessor);
        Map properties = new HashMap();
        properties.put("hibernate.cache.use_second_level_cache", false);
        properties.put("hibernate.cache.region.factory_class", org.hibernate.cache.ehcache.SingletonEhCacheRegionFactory.class);
        localContainerEntityManagerFactoryBean.setJpaPropertyMap(properties);
        localContainerEntityManagerFactoryBean.setDataSource(dataSource());
        localContainerEntityManagerFactoryBean.setPersistenceProviderClass(HibernatePersistenceProvider.class);
        localContainerEntityManagerFactoryBean.setPackagesToScan(packages);
        localContainerEntityManagerFactoryBean.setPersistenceUnitName("turbo");

        // entities will be loaded later in the Action-Service using the data from database
/*
        try {
            reloadEntities(GENERATED_SOURCE_FOLDER_ROOT, MODEL_PACKAGE);
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException(e);
        }
*/

        return localContainerEntityManagerFactoryBean;
    }

    @Obsolete
    public static void reloadEntities(String rootFolder, String modelPackage) throws Exception {
        StringWriter contentWriter = new StringWriter();
        IOUtils.copy(getResourceAsStream("config/models.json"), contentWriter, "UTF-8");
        reloadEntities(contentWriter.toString(), rootFolder, modelPackage);
    }

    public static void reloadEntities(String content, String rootFolder, String modelPackage) throws Exception {
        synchronized (RELOAD_ENTITIES) {
            try {
                FileUtils.deleteDirectory(new File(rootFolder));
            } catch (IOException e) {
            }
            String modelFolderName = rootFolder + File.separator + modelPackage;
            File modelFolder = new File(modelFolderName);

            modelFolder.mkdirs();
            // generate the java entity files
            generateModelFiles(content, rootFolder, modelPackage);
            // compile java entity files
            compileJavaFile(rootFolder);
            // load java entity files
            Collection<File> javaFiles = FileUtil.findFilesInFolder(modelFolder, "java");
            for (File javaFile : javaFiles) {
                getClassLoader().loadClass(modelPackage + "." + javaFile.getName().replace(".java", ""));
            }
            RELOAD_ENTITIES = true;
            updateLocalContainerEntityManagerFactoryBean();
        }

        /**
         * keep this for debugging purposes
         */
        /*Reflections reflections = new Reflections("turbo", new SubTypesScanner(false));
        Set<Class<?>> subTypesOf = reflections.getSubTypesOf(Object.class);
        System.out.println(subTypesOf.toString());*/
    }


    public static void updateLocalContainerEntityManagerFactoryBean() {
        synchronized (RELOAD_ENTITIES) {
            if (RELOAD_ENTITIES) {
                localContainerEntityManagerFactoryBean.afterPropertiesSet();
                RELOAD_ENTITIES = false;
            }
        }
    }


    /**
     * compile all the java files in the given path
     *
     * @param rootPath
     * @throws Exception
     */
    private static void compileJavaFile(String rootPath) throws Exception {
        /**
         * get a handle to the main class-loader
         */
        getClassLoader(rootPath);

        Collection<File> javaFiles = FileUtil.findFilesInFolder(new File(rootPath), "java");

        JavaCompiler javaCompiler = ToolProvider.getSystemJavaCompiler();
        DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<JavaFileObject>();
        StandardJavaFileManager fileManager = javaCompiler.getStandardFileManager(diagnostics, Locale.ENGLISH, Charset.forName("UTF-8"));
        Iterable<? extends JavaFileObject> compilationUnits = fileManager.getJavaFileObjectsFromFiles(javaFiles);
        javaCompiler.getTask(null, fileManager, diagnostics, null, null, compilationUnits).call();
        for (Diagnostic diagnostic : diagnostics.getDiagnostics()) {
            System.out.format("Error on line %d in %s%n", diagnostic.getLineNumber(), diagnostic.getSource().toString());
        }
        fileManager.close();

    }

    private static void generateModelFiles(String content, String rootFolder, String modelPackage) throws Exception {
        // load the db description file
        Map<String, List<Map>> jsonMap = new Gson().fromJson(content, Map.class);
        String modelFolder = rootFolder + File.separator + modelPackage;
        List<Map> models = jsonMap.get("models");
        List<String> modelNames = new ArrayList<>();
        for (Map model : models) {
            if (GeneralUtil.isTrue((String) model.get("isView"))) {
                continue;
            }
            modelNames.add((String) model.get("name"));
        }

        for (Map model : models) {
            if (GeneralUtil.isTrue((String) model.get("isView"))) {
                continue;
            }
            // creates java files
            String modelFileName = modelFolder + File.separator + model.get("name") + ".java";
            Map modelClassInfo = new HashMap<>();
            modelClassInfo.put("model", model);
            modelClassInfo.put("isRelationshipType", new RelationMethod(modelNames));
            modelClassInfo.put("hasIndexes", new ConstraintTypeMethod("index"));
            modelClassInfo.put("hasUniqueConstraints", new ConstraintTypeMethod("unique"));
            modelClassInfo.put("packageName", modelPackage);

            Template modelClassTemplate = getFreeMarker().getTemplate("_framework/templates/class.ftl");
            createFile(modelClassTemplate, modelClassInfo, modelFileName);
        }
    }


    public static freemarker.template.Configuration getFreeMarker() {
        freeMarker.setClassLoaderForTemplateLoading(resourceLoader, "/");
        return freeMarker;
    }


    private static void initializeFreeMaker() {
        freeMarker = new freemarker.template.Configuration(new Version("2.3.21"));
        {
            freeMarker.setClassForTemplateLoading(Application.class, "/");
            freeMarker.setDefaultEncoding("UTF-8");
            freeMarker.setLocale(Locale.US);
            freeMarker.setTemplateExceptionHandler(TemplateExceptionHandler.RETHROW_HANDLER);
        }
    }


    public static InputStream getResourceAsStream(String resourceRelativePath) {
        return resourceLoader.getResourceAsStream(resourceRelativePath);
    }

    public static URL getResource(String resourceRelativePath) {
        return resourceLoader.getResource(resourceRelativePath);
    }


    public static void setResourceLoader(String rootPath) {
        if (rootPath != null) {
            URL[] classUrls = new URL[0];
            try {
                classUrls = new URL[]{new File(rootPath).toURI().toURL()};
            } catch (MalformedURLException e) {
                e.printStackTrace();
            }
            resourceLoader = new URLClassLoader(classUrls, ClassLoader.getSystemClassLoader());
        }
    }


    public static ClassLoader getClassLoader() {
        return getClassLoader(null);
    }


    /**
     * @param rootPath is either the root folder or a jar file
     * @return
     */
    public static ClassLoader getClassLoader(String rootPath) {
        if (rootPath != null) {
            URL[] classUrls = new URL[0];
            try {
                classUrls = new URL[]{new File(rootPath).toURI().toURL()};
            } catch (MalformedURLException e) {
                e.printStackTrace();
            }
            classLoader = new URLClassLoader(classUrls, ClassLoader.getSystemClassLoader());
            List<Class<?>> classes = ClassFinder.find(HARDCODED_MODEL_PACKAGE);
            for (Class<?> clazz : classes) {
                try {
                    classLoader.loadClass(clazz.getName());
                } catch (ClassNotFoundException e) {
                    throw new RuntimeException(e);
                }
            }
        }
        Thread.currentThread().setContextClassLoader(classLoader);
        return classLoader;
    }


    /**
     * Create files with the provided freemaker template, model objects in the given path
     *
     * @param modelClassTemplate
     * @param model
     * @param absolutePath
     */
    private static void createFile(Template modelClassTemplate, Map model, String absolutePath) {
        try {
            File file = new File(absolutePath);
            file.createNewFile();
            FileWriter modelFileWriter = new FileWriter(file);
            modelClassTemplate.process(model, modelFileWriter);
            modelFileWriter.flush();
            modelFileWriter.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }


    @Bean(destroyMethod = "shutdown")
    @ConditionalOnMissingClass(name = "com.eknv.turbo.config.HerokuDatabaseConfiguration")
    @Profile("!" + Constants.SPRING_PROFILE_CLOUD)
    public DataSource dataSource() {
        log.debug("Configuring Datasource");
        if (propertyResolver.getProperty("url") == null && propertyResolver.getProperty("databaseName") == null) {
            log.error("Your database connection pool configuration is incorrect! The application" +
                            "cannot start. Please check your Spring profile, current profiles are: {}",
                    Arrays.toString(env.getActiveProfiles()));

            throw new ApplicationContextException("Database connection pool is not configured correctly");
        }
        HikariConfig config = new HikariConfig();
        config.setDataSourceClassName(propertyResolver.getProperty("dataSourceClassName"));
        if (propertyResolver.getProperty("url") == null || "".equals(propertyResolver.getProperty("url"))) {
            config.addDataSourceProperty("databaseName", propertyResolver.getProperty("databaseName"));
            config.addDataSourceProperty("serverName", propertyResolver.getProperty("serverName"));
        } else {
            config.addDataSourceProperty("url", propertyResolver.getProperty("url"));
        }
        config.addDataSourceProperty("user", propertyResolver.getProperty("username"));
        config.addDataSourceProperty("password", propertyResolver.getProperty("password"));

        //MySQL optimizations, see https://github.com/brettwooldridge/HikariCP/wiki/MySQL-Configuration
        if ("com.mysql.jdbc.jdbc2.optional.MysqlDataSource".equals(propertyResolver.getProperty("dataSourceClassName"))) {
            config.addDataSourceProperty("cachePrepStmts", propertyResolver.getProperty("cachePrepStmts", "true"));
            config.addDataSourceProperty("prepStmtCacheSize", propertyResolver.getProperty("prepStmtCacheSize", "250"));
            config.addDataSourceProperty("prepStmtCacheSqlLimit", propertyResolver.getProperty("prepStmtCacheSqlLimit", "2048"));
            config.addDataSourceProperty("useServerPrepStmts", propertyResolver.getProperty("useServerPrepStmts", "true"));
        }
        if (metricRegistry != null) {
            config.setMetricRegistry(metricRegistry);
        }
        return new HikariDataSource(config);
    }

    @Bean
    public SpringLiquibase liquibase(DataSource dataSource) {
        SpringLiquibase liquibase = new SpringLiquibase();
        liquibase.setDataSource(dataSource);
        liquibase.setChangeLog("classpath:config/liquibase/master.xml");
        liquibase.setContexts("development, production");
        if (env.acceptsProfiles(Constants.SPRING_PROFILE_FAST)) {
            if ("org.h2.jdbcx.JdbcDataSource".equals(propertyResolver.getProperty("dataSourceClassName"))) {
                liquibase.setShouldRun(true);
                log.warn("Using '{}' profile with H2 database in memory is not optimal, you should consider switching to" +
                        " MySQL or Postgresql to avoid rebuilding your database upon each start.", Constants.SPRING_PROFILE_FAST);
            } else {
                liquibase.setShouldRun(false);
            }
        } else {
            log.debug("Configuring Liquibase");
        }
        return liquibase;
    }

}

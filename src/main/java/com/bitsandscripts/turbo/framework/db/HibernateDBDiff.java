package com.eknv.turbo.framework.db;


import com.eknv.turbo.config.DatabaseConfiguration;
import com.eknv.turbo.framework.Deployment;
import com.eknv.turbo.service.ActionService;
import liquibase.Liquibase;
import liquibase.database.Database;
import liquibase.database.core.MySQLDatabase;
import liquibase.database.jvm.JdbcConnection;
import liquibase.diff.DiffResult;
import liquibase.diff.Difference;
import liquibase.diff.ObjectDifferences;
import liquibase.diff.compare.CompareControl;
import liquibase.diff.output.DiffOutputControl;
import liquibase.diff.output.changelog.DiffToChangeLog;
import liquibase.diff.output.report.DiffToReport;
import liquibase.ext.hibernate.database.HibernateSpringDatabase;
import liquibase.ext.hibernate.database.connection.HibernateConnection;
import liquibase.logging.LogFactory;
import liquibase.logging.Logger;
import liquibase.resource.ClassLoaderResourceAccessor;
import liquibase.resource.FileSystemResourceAccessor;
import liquibase.structure.DatabaseObject;
import liquibase.structure.core.*;
import org.hibernate.Session;
import org.hibernate.dialect.MySQL5InnoDBDialect;
import org.hibernate.internal.SessionImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.bind.RelaxedPropertyResolver;
import org.springframework.context.ApplicationContext;
import org.springframework.context.EnvironmentAware;
import org.springframework.core.env.Environment;
import org.springframework.orm.jpa.EntityManagerFactoryUtils;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionCallbackWithoutResult;
import org.springframework.transaction.support.TransactionTemplate;

import javax.annotation.PostConstruct;
import javax.persistence.EntityManager;
import java.io.*;
import java.sql.Connection;
import java.util.*;

@Service
@Transactional(propagation = Propagation.REQUIRED)
public class HibernateDBDiff implements EnvironmentAware {

    private final static Logger log = LogFactory.getLogger();

    private static final String PACKAGES = "turbo,com.eknv.turbo.domain";
    private String dbDifferences;


    @Autowired
    ApplicationContext applicationContext;

    @Autowired
    private LocalContainerEntityManagerFactoryBean entityManagerFactoryBean;

    private CompareControl compareControl;

    private File changeLogFile;

    private List<String> tablesToBeIgnored = new ArrayList<>();
    private Set<Class<? extends DatabaseObject>> typesToInclude = new HashSet<Class<? extends DatabaseObject>>();

    @Autowired
    private Deployment deployment;

    private ActionService actionService;

    private RelaxedPropertyResolver propertyResolver;
    private Environment env;


    @Autowired
    @Qualifier("transactionManager")
    protected PlatformTransactionManager txManager;


    @Override
    public void setEnvironment(Environment env) {
        this.env = env;
        this.propertyResolver = new RelaxedPropertyResolver(env, "liquibase.");
    }


    /**
     * Generates a changelog from the Hibernate mapping, creates the database
     * according to the changelog, compares, the database with the mapping.
     *
     * @throws Exception
     */
    @PostConstruct
    public String setDBDifferences() throws Exception {

        actionService = applicationContext.getBean(ActionService.class);

        TransactionTemplate transactionTemplate = new TransactionTemplate(txManager);
        transactionTemplate.execute(new TransactionCallbackWithoutResult() {

            @Override
            protected void doInTransactionWithoutResult(TransactionStatus status) {

                Database jdbcDatabase = null;
                Database hibernateDatabase = null;

                try {
                    setUp();

                    jdbcDatabase = getDatabase();

                    Liquibase liquibase = new Liquibase((String) null, new ClassLoaderResourceAccessor(DatabaseConfiguration.getClassLoader()), jdbcDatabase);

                    hibernateDatabase = new HibernateSpringDatabase();
                    hibernateDatabase.setConnection(new JdbcConnection(
                        new HibernateConnection("hibernate:spring:" + PACKAGES + "?dialect=" + MySQL5InnoDBDialect.class.getName())));

                    DiffResult diffResult = liquibase.diff(hibernateDatabase, jdbcDatabase, compareControl);

                    ignoreFrameworkTables(diffResult);
                    ignoreConversionFromFloatToDouble64(diffResult);

                    //String directoryName = propertyResolver.getProperty("root");
                    String directoryName = System.getProperty("java.io.tmpdir");
                    changeLogFile = new File(directoryName + File.separator + "lb_update" + new Date().getTime() + ".xml");
                    dbDifferences = toChangeLog(diffResult);
                    //write to the liquibase diff file
                    OutputStream changeLogOutputStream = new FileOutputStream(changeLogFile);
                    changeLogOutputStream.write(dbDifferences.getBytes("UTF-8"));
                    changeLogOutputStream.close();

                    log.info("Changelog:\n" + dbDifferences);

                    if (dbDifferences != null && !dbDifferences.isEmpty()
                        && dbDifferences.contains("</databaseChangeLog")) {
                        deployment.goToMaintenanceMode();
                    }

                //todo/kn.. catch and finally to be tested and extended.. related to the problem that the db freezes after an exception
                } catch (Exception e) {

/*                    try {
                        if (jdbcDatabase.getConnection() != null) {
                            jdbcDatabase.getConnection().close();
                        }
                        if (jdbcDatabase.getConnection() != null) {
                            jdbcDatabase.getConnection().close();
                        }
                    } catch (DatabaseException e1) {
                        e1.printStackTrace();
                    }*/
                    e.printStackTrace();
                    throw new RuntimeException(e);
                } finally {
                    /*try {
                        if(hibernateDatabase.getConnection()!=null) {
                            hibernateDatabase.getConnection().close();
                        }
                        if(jdbcDatabase.getConnection()!=null) {
                            jdbcDatabase.getConnection().close();
                        }
                    } catch (DatabaseException e) {
                        e.printStackTrace();
                    }*/
                }
            }
        });

        return dbDifferences;
    }

    public String getDbDifferences() {
        return dbDifferences;
    }


    private Database getDatabase() throws Exception {
        Database database = new MySQLDatabase();
        database.setConnection(new JdbcConnection(getConnection()));
        return database;
    }


    /**
     * note that the connection should be taken from a new session because liquibase would mess with the current session
     * @return
     * @throws Exception
     */
    private Connection getConnection() throws Exception {
        DatabaseConfiguration.getClassLoader();
        EntityManager entityManager = EntityManagerFactoryUtils.doGetTransactionalEntityManager(entityManagerFactoryBean.getObject(), null, true);
        Session session = entityManager.unwrap(Session.class);
        return ((SessionImpl) session).connection();
    }


    public String updateDB(boolean runPatches) throws Exception {

        // run the before patches
        if(runPatches) {
            actionService.runBeforePatches();
        }

        String updateMessages;
        Database database = getDatabase();
        try {
            Liquibase liquibase = new Liquibase(changeLogFile.toString(), new FileSystemResourceAccessor(), database);
            StringWriter stringWriter = new StringWriter();
            liquibase.update((String) null, stringWriter);
            updateMessages = stringWriter.toString();
            log.info(updateMessages);
            liquibase.update((String) null);
            dbDifferences = null;
        } catch (Exception e) {
            if (database.getConnection() != null) {
                database.getConnection().close();
            }
            throw new RuntimeException(e);
        }

        // run the after patches
        if (runPatches) {
            actionService.runAfterPatches();
        }

        return updateMessages;
    }


    private void setUp() throws Exception {

        if (!tablesToBeIgnored.isEmpty()) {
            return;
        }

        tablesToBeIgnored.addAll(Arrays.asList(
            "databasechangelog",
            "databasechangeloglock",
            "jhi_authority",
            "jhi_persistent_audit_event",
            "jhi_persistent_audit_evt_data",
            "jhi_persistent_token",
            "jhi_user",
            "jhi_user_authority"
        ));

        typesToInclude.add(Table.class);
        typesToInclude.add(Column.class);
        typesToInclude.add(PrimaryKey.class);
        typesToInclude.add(ForeignKey.class);
        typesToInclude.add(UniqueConstraint.class);
        typesToInclude.add(Sequence.class);
        compareControl = new CompareControl(typesToInclude);
        compareControl.addSuppressedField(Table.class, "remarks");
        compareControl.addSuppressedField(Column.class, "remarks");
        compareControl.addSuppressedField(Column.class, "certainDataType");
        compareControl.addSuppressedField(Column.class, "autoIncrementInformation");
        compareControl.addSuppressedField(ForeignKey.class, "deleteRule");
        compareControl.addSuppressedField(ForeignKey.class, "updateRule");
        compareControl.addSuppressedField(Index.class, "unique");
    }


    private String toChangeLog(DiffResult diffResult) throws Exception {
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        PrintStream printStream = new PrintStream(byteArrayOutputStream, true, "UTF-8");
        DiffToChangeLog diffToChangeLog = new DiffToChangeLog(diffResult,
            new DiffOutputControl().setIncludeCatalog(false).setIncludeSchema(false));
        diffToChangeLog.print(printStream);
        printStream.close();
        return byteArrayOutputStream.toString("UTF-8");
    }


    private String toString(DiffResult diffResult) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PrintStream printStream = new PrintStream(out, true, "UTF-8");
        DiffToReport diffToReport = new DiffToReport(diffResult, printStream);
        diffToReport.print();
        printStream.close();
        return out.toString("UTF-8");
    }


    private void ignoreFrameworkTables(DiffResult diffResult) throws Exception {

        // Table.class
        Set<Table> unexpectedTables = diffResult.getUnexpectedObjects(Table.class);
        for (Iterator<Table> iterator = unexpectedTables.iterator(); iterator.hasNext(); ) {
            Table table = iterator.next();
            if (isFrameworkTable(table.getName())) {
                diffResult.getUnexpectedObjects().remove(table);
            }
        }
        Set<Table> missingTables = diffResult.getMissingObjects(Table.class);
        for (Iterator<Table> iterator = missingTables.iterator(); iterator.hasNext(); ) {
            Table table = iterator.next();
            if (isFrameworkTable(table.getName())) {
                diffResult.getMissingObjects().remove(table);
            }
        }
        Map<Table, ObjectDifferences> changedTables = diffResult.getChangedObjects(Table.class);
        for (Iterator<Table> iterator = changedTables.keySet().iterator(); iterator.hasNext(); ) {
            Table table = iterator.next();
            if (isFrameworkTable(table.getName())) {
                diffResult.getChangedObjects().remove(table);
            }
        }

        // Column.class
        Set<Column> unexpectedColumns = diffResult.getUnexpectedObjects(Column.class);
        for (Iterator<Column> iterator = unexpectedColumns.iterator(); iterator.hasNext(); ) {
            Column column = iterator.next();
            if (isFrameworkTable(column.getRelation().getName())) {
                diffResult.getUnexpectedObjects().remove(column);
            }
        }
        Set<Column> missingColumns = diffResult.getMissingObjects(Column.class);
        for (Iterator<Column> iterator = missingColumns.iterator(); iterator.hasNext(); ) {
            Column column = iterator.next();
            if (isFrameworkTable(column.getRelation().getName())) {
                diffResult.getMissingObjects().remove(column);
            }
        }
        Map<Column, ObjectDifferences> changedColumns = diffResult.getChangedObjects(Column.class);
        for (Iterator<Column> iterator = changedColumns.keySet().iterator(); iterator.hasNext(); ) {
            Column column = iterator.next();
            if (isFrameworkTable(column.getRelation().getName())) {
                diffResult.getChangedObjects().remove(column);
            }
        }

        // Index.class
        Set<Index> unexpectedIndexes = diffResult.getUnexpectedObjects(Index.class);
        for (Iterator<Index> iterator = unexpectedIndexes.iterator(); iterator.hasNext(); ) {
            Index index = iterator.next();
            if (isFrameworkTable(index.getTable().getName())) {
                diffResult.getUnexpectedObjects().remove(index);
            }
        }
        Set<Index> missingIndexes = diffResult.getMissingObjects(Index.class);
        for (Iterator<Index> iterator = missingIndexes.iterator(); iterator.hasNext(); ) {
            Index index = iterator.next();
            if (isFrameworkTable(index.getTable().getName())) {
                diffResult.getMissingObjects().remove(index);
            }
        }
        Map<Index, ObjectDifferences> changedIndexes = diffResult.getChangedObjects(Index.class);
        for (Iterator<Index> iterator = changedIndexes.keySet().iterator(); iterator.hasNext(); ) {
            Index index = iterator.next();
            if (isFrameworkTable(index.getTable().getName())) {
                diffResult.getChangedObjects().remove(index);
            }
        }

        // PrimaryKey.class
        Set<PrimaryKey> unexpectedPrimaryKeys = diffResult.getUnexpectedObjects(PrimaryKey.class);
        for (Iterator<PrimaryKey> iterator = unexpectedPrimaryKeys.iterator(); iterator.hasNext(); ) {
            PrimaryKey primaryKey = iterator.next();
            if (isFrameworkTable(primaryKey.getTable().getName())) {
                diffResult.getUnexpectedObjects().remove(primaryKey);
            }
        }
        Set<PrimaryKey> missingPrimaryKeys = diffResult.getMissingObjects(PrimaryKey.class);
        for (Iterator<PrimaryKey> iterator = missingPrimaryKeys.iterator(); iterator.hasNext(); ) {
            PrimaryKey primaryKey = iterator.next();
            if (isFrameworkTable(primaryKey.getTable().getName())) {
                diffResult.getMissingObjects().remove(primaryKey);
            }
        }
        Map<PrimaryKey, ObjectDifferences> changedPrimaryKeys = diffResult.getChangedObjects(PrimaryKey.class);
        for (Iterator<PrimaryKey> iterator = changedPrimaryKeys.keySet().iterator(); iterator.hasNext(); ) {
            PrimaryKey primaryKey = iterator.next();
            if (isFrameworkTable(primaryKey.getTable().getName())) {
                diffResult.getChangedObjects().remove(primaryKey);
            }
        }

        // ForeignKey.class
        Set<ForeignKey> unexpectedForeignKeys = diffResult.getUnexpectedObjects(ForeignKey.class);
        for (Iterator<ForeignKey> iterator = unexpectedForeignKeys.iterator(); iterator.hasNext(); ) {
            ForeignKey foreignKey = iterator.next();
            if (isFrameworkTable(foreignKey.getForeignKeyTable().getName())) {
                diffResult.getUnexpectedObjects().remove(foreignKey);
            }
        }
        Set<ForeignKey> missingForeignKeys = diffResult.getMissingObjects(ForeignKey.class);
        for (Iterator<ForeignKey> iterator = missingForeignKeys.iterator(); iterator.hasNext(); ) {
            ForeignKey foreignKey = iterator.next();
            if (isFrameworkTable(foreignKey.getForeignKeyTable().getName())) {
                diffResult.getMissingObjects().remove(foreignKey);
            }
        }
        Map<ForeignKey, ObjectDifferences> changedForeignKeys = diffResult.getChangedObjects(ForeignKey.class);
        for (Iterator<ForeignKey> iterator = changedForeignKeys.keySet().iterator(); iterator.hasNext(); ) {
            ForeignKey foreignKey = iterator.next();
            if (isFrameworkTable(foreignKey.getForeignKeyTable().getName())) {
                diffResult.getChangedObjects().remove(foreignKey);
            }
        }

        // UniqueConstraint.class
        Set<UniqueConstraint> unexpectedUniqueConstraints = diffResult.getUnexpectedObjects(UniqueConstraint.class);
        for (Iterator<UniqueConstraint> iterator = unexpectedUniqueConstraints.iterator(); iterator.hasNext(); ) {
            UniqueConstraint uniqueConstraint = iterator.next();
            if (isFrameworkTable(uniqueConstraint.getTable().getName())) {
                diffResult.getUnexpectedObjects().remove(uniqueConstraint);
            }
        }
        Set<UniqueConstraint> missingUniqueConstraints = diffResult.getMissingObjects(UniqueConstraint.class);
        for (Iterator<UniqueConstraint> iterator = missingUniqueConstraints.iterator(); iterator.hasNext(); ) {
            UniqueConstraint uniqueConstraint = iterator.next();
            if (isFrameworkTable(uniqueConstraint.getTable().getName())) {
                diffResult.getMissingObjects().remove(uniqueConstraint);
            }
        }
        Map<UniqueConstraint, ObjectDifferences> changedUniqueConstraints = diffResult.getChangedObjects(UniqueConstraint.class);
        for (Iterator<UniqueConstraint> iterator = changedUniqueConstraints.keySet().iterator(); iterator.hasNext(); ) {
            UniqueConstraint uniqueConstraint = iterator.next();
            if (isFrameworkTable(uniqueConstraint.getTable().getName())) {
                diffResult.getChangedObjects().remove(uniqueConstraint);
            }
        }

    }


    private boolean isFrameworkTable(String tableName) {
        for (String frameworkTableName : tablesToBeIgnored) {
            if (frameworkTableName.equalsIgnoreCase(tableName)) {
                return true;
            }
        }
        return false;
    }


    /**
     * Columns created as float are seen as DOUBLE(64) in database metadata.
     * HsqlDB bug?
     *
     * @param diffResult
     * @throws Exception
     */
    private void ignoreConversionFromFloatToDouble64(DiffResult diffResult)
        throws Exception {
        Map<DatabaseObject, ObjectDifferences> differences = diffResult.getChangedObjects();
        for (Iterator<Map.Entry<DatabaseObject, ObjectDifferences>> iterator = differences.entrySet().iterator(); iterator.hasNext(); ) {
            Map.Entry<DatabaseObject, ObjectDifferences> changedObject = iterator.next();
            Difference difference = changedObject.getValue().getDifference("type");
            if (difference != null
                && difference.getReferenceValue() != null
                && difference.getComparedValue() != null
                && difference.getReferenceValue().toString().equals("float")
                && difference.getComparedValue().toString().startsWith("DOUBLE(64)")) {
                log.info("Ignoring difference "
                    + changedObject.getKey().toString() + " "
                    + difference.toString());
                changedObject.getValue()
                    .removeDifference(difference.getField());
            }
        }
    }

}


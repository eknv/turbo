C = {
    /**
     * primitives
     */
    Object: Java.type('java.lang.Object'),
    Long: Java.type('java.lang.Long'),
    Double: Java.type('java.lang.Double'),
    Integer: Java.type('java.lang.Integer'),
    String: Java.type('java.lang.String'),
    BigDecimal: Java.type('java.math.BigDecimal'),
    Boolean: Java.type('java.lang.Boolean'),
    LocalDate: Java.type('java.time.LocalDate'),
    Date: Java.type('java.util.Date'),
    LocalDateTime: Java.type('java.time.LocalDateTime'),

    /**
     * string
     */
    StringBuilder: Java.type('java.lang.StringBuilder'),
    /* StringUtils : Java.type('org.apache.commons.lang.StringUtils'),*/
    StringUtils: Java.type('org.apache.commons.lang3.StringUtils'),
    Pattern: Java.type('java.util.regex.Pattern'),
    Matcher: Java.type('java.util.regex.Matcher'),

    /**
     * collections
     */
    Map: Java.type('java.util.Map'),
    HashMap: Java.type('java.util.HashMap'),
    Collection: Java.type('java.util.Collection'),
    List: Java.type('java.util.List'),
    Set: Java.type('java.util.Set'),
    HashSet: Java.type('java.util.HashSet'),
    ArrayList: Java.type('java.util.ArrayList'),
    Arrays: Java.type('java.util.Arrays'),

    /**
     * concurrency
     */
    Thread: Java.type('java.lang.Thread'),
    ExecutorService: Java.type('java.util.concurrent.ExecutorService'),
    Executors: Java.type('java.util.concurrent.Executors'),
    CountDownLatch: Java.type('java.util.concurrent.CountDownLatch'),
    TimeUnit: Java.type('java.util.concurrent.TimeUnit'),

    /**
     * database
     */
    LockOptions: Java.type('org.hibernate.LockOptions'),
    DBC: Java.type('com.eknv.turbo.config.DatabaseConfiguration'),
    Hibernate: Java.type('org.hibernate.Hibernate'),
    LockOptions: Java.type('org.hibernate.LockOptions'),


    /**
     * system
     */
    System: Java.type('java.lang.System'),
    Class: Java.type('java.lang.Class'),
    ProcessBuilder: Java.type('java.lang.ProcessBuilder'),
    ThreadLocalRandom: Java.type('java.util.concurrent.ThreadLocalRandom'),

    /**
     * Files
     */
    File: Java.type('java.io.File'),
    BufferedReader: Java.type('java.io.BufferedReader'),
    FileUtils: Java.type('org.apache.commons.io.FileUtils'),
    InputStreamReader: Java.type('java.io.InputStreamReader'),

    /**
     * Exceptions
     */
    InterruptedException: Java.type('java.lang.InterruptedException'),
    Exception: Java.type('java.lang.Exception'),
    ExceptionUtils: Java.type('org.apache.commons.lang.exception.ExceptionUtils'),

    /**
     * others
     */
    Gson: Java.type('com.google.gson.Gson'),
    GeneralUtil: Java.type('com.eknv.turbo.util.GeneralUtil'),
    DateUtil: Java.type('com.eknv.turbo.util.DateUtil'),

    /**
     * framework
     */
    DesignData: Java.type('com.eknv.turbo.domain.DesignData'),
    TurboID: Java.type('com.eknv.turbo.domain.TurboID'),
    TurboIdGenerator: Java.type('com.eknv.turbo.domain.util.TurboIdGenerator')

}



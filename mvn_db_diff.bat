:: Note, after running the following command, include/enlist the generated xml file in the main liquibase config file:
:: src\main\resources\config\liquibase\master.xml
:: then build the project again and start the application to apply the changes
mvn compile liquibase:diff -Pdev

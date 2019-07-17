package com.eknv.turbo.util;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Enumeration;
import java.util.Map;
import java.util.TreeMap;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;

/**
 * This class contains some utility methods to find files in the application classpath
 */
public class ClassPathSearcher {

    private static Log log = LogFactory.getLog(ClassPathSearcher.class);

    public Map<String, InputStream> findFilesInClassPath(String fileNamePattern) {
        Map<String, InputStream> result = new TreeMap<String, InputStream>();
        String classPath = System.getProperty("java.class.path");
        String[] pathElements = classPath.split(System.getProperty("path.separator"));
        for (String element : pathElements) {
            try {
                File newFile = new File(element);
                if (newFile.isDirectory()) {
                    result.putAll(findResourceInDirectory(newFile, fileNamePattern));
                } else {
                    result.putAll(findResourceInFile(newFile, fileNamePattern));
                }
            } catch (IOException e) {
                log.error("Exception:", e);
            }
        }
        return result;
    }

    public Map<String, InputStream> findResourceInFile(File resourceFile, String fileNamePattern) throws IOException {
        Map<String, InputStream> result = new TreeMap<String, InputStream>();
        if (!resourceFile.canRead()) {
            return result;
        }
        String absolutePath = resourceFile.getAbsolutePath();
        absolutePath = absolutePath.replace("\\", "/");
        if (absolutePath.endsWith(".jar")) {
            log.debug("jar file found: " + absolutePath);
            JarFile jarFile = new JarFile(resourceFile);
            Enumeration<JarEntry> entries = jarFile.entries();
            while (entries.hasMoreElements()) {
                JarEntry singleEntry = entries.nextElement();
                String path = singleEntry.getName();
                path = path.replace("\\", "/");
                if (path.matches(fileNamePattern)) {
                    result.put(jarFile.getName() + "/" + path, jarFile.getInputStream(singleEntry));
                }
            }
        } else if (absolutePath.contains("classes\\_app")) {
            result.put(absolutePath, new FileInputStream(absolutePath));
        }
        return result;
    }

    private Map<String, InputStream> findResourceInDirectory(File directory, String fileNamePattern) throws IOException {
        Map<String, InputStream> result = new TreeMap<String, InputStream>();
        File[] files = directory.listFiles();
        for (File currentFile : files) {
            String absolutePath = currentFile.getAbsolutePath();
            absolutePath = absolutePath.replace("\\", "/");
            if (absolutePath.matches(fileNamePattern)) {
                result.put(absolutePath, new FileInputStream(currentFile));
            } else if (currentFile.isDirectory()) {
                result.putAll(findResourceInDirectory(currentFile, fileNamePattern));
            } else {
                result.putAll(findResourceInFile(currentFile, fileNamePattern));
            }
        }
        return result;
    }
}


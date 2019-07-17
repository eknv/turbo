package com.eknv.turbo.util;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.io.filefilter.IOFileFilter;
import org.apache.commons.io.filefilter.TrueFileFilter;

import java.io.*;
import java.util.Collection;
import java.util.Map;
import java.util.jar.Attributes;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;
import java.util.jar.Manifest;

public final class FileUtil {

    private static ClassPathSearcher classPathSearcher = new ClassPathSearcher();
    public static final String jarExtension = ".jar";

    private FileUtil() {
    }

    public static Collection<File> findFilesInFolder(File rootFolder, String extension) throws Exception {
        return FileUtils.listFiles(rootFolder, new IOFileFilter() {
            @Override
            public boolean accept(File file) {
                return file.getName().endsWith("." + extension);
            }

            @Override
            public boolean accept(File dir, String name) {
                return name.endsWith("." + extension);
            }
        }, TrueFileFilter.INSTANCE);
    }


    public static void createJarFile(String regexPattern, String jarFileAbsolutePath) throws IOException {
        Manifest manifest = new Manifest();
        manifest.getMainAttributes().put(Attributes.Name.MANIFEST_VERSION, "1.0");
        JarOutputStream jarFile = new JarOutputStream(new FileOutputStream(jarFileAbsolutePath), manifest);

        Map<String, InputStream> foundFiles = classPathSearcher.findFilesInClassPath(regexPattern);
        for (Map.Entry<String, InputStream> inputStreamEntry : foundFiles.entrySet()) {
            String fileName = inputStreamEntry.getKey();
            InputStream inputStream = inputStreamEntry.getValue();

            if (fileName.contains(jarExtension)) {
                fileName = fileName.substring(fileName.indexOf(jarExtension) + jarExtension.length() + 1);
            } else if (fileName.contains("classes\\_app")) {
                fileName = fileName.substring(fileName.indexOf("classes\\_app") + "classes\\".length());
                fileName = fileName.replace("\\", "/");
            }

            addFromJar(new File(fileName), inputStream, jarFile);
        }

        jarFile.close();
    }


    private static void addFromJar(File source, InputStream inputStream, JarOutputStream target) throws IOException {
        BufferedInputStream in = null;
        try {
            JarEntry entry = new JarEntry(source.getPath().replace("\\", "/"));
            entry.setTime(source.lastModified());
            target.putNextEntry(entry);

            if (inputStream == null) {
                inputStream = new FileInputStream(source);
            }
            in = new BufferedInputStream(inputStream);

            byte[] buffer = new byte[1024];
            while (true) {
                int count = in.read(buffer);
                if (count == -1)
                    break;
                target.write(buffer, 0, count);
            }
            target.closeEntry();
        } finally {
            if (in != null)
                in.close();
        }
    }


    private static void addFromFileSystem(File source, JarOutputStream target) throws IOException {
        BufferedInputStream in = null;
        try {
            if (source.isDirectory()) {
                String name = source.getPath().replace("\\", "/");
                if (!name.isEmpty()) {
                    if (!name.endsWith("/"))
                        name += "/";
                    JarEntry entry = new JarEntry(name);
                    entry.setTime(source.lastModified());
                    target.putNextEntry(entry);
                    target.closeEntry();
                }
                for (File nestedFile : source.listFiles())
                    addFromFileSystem(nestedFile, target);
                return;
            }

            JarEntry entry = new JarEntry(source.getPath().replace("\\", "/"));
            entry.setTime(source.lastModified());
            target.putNextEntry(entry);

            in = new BufferedInputStream(new FileInputStream(source));

            byte[] buffer = new byte[1024];
            while (true) {
                int count = in.read(buffer);
                if (count == -1)
                    break;
                target.write(buffer, 0, count);
            }
            target.closeEntry();
        } finally {
            if (in != null)
                in.close();
        }
    }


    public static void extractJarFile(String directoryName, String jarFile) {
        try {
            java.util.jar.JarFile jar = new java.util.jar.JarFile(jarFile);
            java.util.Enumeration enumEntries = jar.entries();
            while (enumEntries.hasMoreElements()) {
                java.util.jar.JarEntry file = (java.util.jar.JarEntry) enumEntries.nextElement();
                File f = new File(directoryName + File.separator + file.getName());
                if (file.isDirectory()) { // if its a directory, create it
                    f.mkdir();
                    continue;
                } else {
                    if (!f.getParentFile().exists()) {
                        f.getParentFile().mkdirs();
                    }
                }
                InputStream is = jar.getInputStream(file); // get the input stream
                FileOutputStream fos = new FileOutputStream(f);
                while (is.available() > 0) {  // write contents of 'is' to 'fos'
                    fos.write(is.read());
                }
                fos.close();
                is.close();
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }


    public static String inputStreamAsString(InputStream inputStream) {
        try {
            StringWriter writer = new StringWriter();
            IOUtils.copy(inputStream, writer, "UTF-8");
            return writer.toString();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public void setClassPathSearcher(ClassPathSearcher classPathSearcher) {
        this.classPathSearcher = classPathSearcher;
    }
}

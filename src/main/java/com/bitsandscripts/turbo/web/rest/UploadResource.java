package com.eknv.turbo.web.rest;

import com.eknv.turbo.config.DatabaseConfiguration;
import com.eknv.turbo.framework.Deployment;
import com.eknv.turbo.framework.db.HibernateDBDiff;
import com.eknv.turbo.service.ActionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;

/**
 * REST controller for managing Index.
 */
@RestController
@RequestMapping("/api")
public class UploadResource {

    @Autowired
    private ActionService actionService;

    @Autowired
    private HibernateDBDiff hibernateDBDiff;

    @Autowired
    private Deployment deployment;


    @RequestMapping(value = "/upload", method = RequestMethod.POST)
    public void handleUpload(@RequestParam("file") MultipartFile file) throws IOException {

        if (!file.isEmpty()) {
            InputStream inputStream = file.getInputStream();
            File jarOutputFile = File.createTempFile("APPFILES_COPY", ".jar");
            try {
                OutputStream out = new FileOutputStream(jarOutputFile);
                byte buf[] = new byte[1024];
                int len;
                while ((len = inputStream.read(buf)) > 0)
                    out.write(buf, 0, len);
                out.close();
                inputStream.close();
            } catch (IOException e) {
                throw new RuntimeException(e);
            }

            /**
             * reinitialize the class-loader with the given jar-file
             */
            DatabaseConfiguration.setResourceLoader(jarOutputFile.getAbsolutePath());


            /**
             * build the indexes using the content of the jar file
             */
            actionService.buildIndex(jarOutputFile);

            /**
             * building the data model
             */
            try {
                actionService.reloadEntities();
                hibernateDBDiff.setDBDifferences();
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }

        System.out.println("reached the end");

    }
}


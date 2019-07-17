package com.eknv.turbo.action.framework;


import com.eknv.turbo.framework.AbstractAction;
import com.eknv.turbo.util.FileUtil;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.mime.MultipartEntityBuilder;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.util.EntityUtils;
import org.springframework.stereotype.Component;

import java.io.File;

@Component
public class UploadApp extends AbstractAction {

    @Override
    public Object execute(Object... params) throws Exception {
        String url = "http://127.0.0.1:8080/trainer/api/upload";
        File jarOutputFile = File.createTempFile("appFiles", ".jar");
        FileUtil.createJarFile("_app/(.)*.(html|HTML|js|JS|groovy|GROOVY|json|JSON)", jarOutputFile.getAbsolutePath());
        sendFile(url, jarOutputFile);
        return null;
    }


    private void sendFile(String url, File file) throws Exception {

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


}


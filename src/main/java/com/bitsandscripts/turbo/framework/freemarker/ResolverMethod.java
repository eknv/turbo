package com.eknv.turbo.framework.freemarker;

import com.google.common.base.Charsets;
import com.google.common.io.Resources;
import freemarker.template.SimpleScalar;
import freemarker.template.TemplateMethodModelEx;
import freemarker.template.TemplateModelException;

import java.io.IOException;
import java.net.URL;
import java.util.List;

public class ResolverMethod implements TemplateMethodModelEx {

    public String exec(List args) throws TemplateModelException {
        if (args.size() != 3) {
            return "";
        }
        String resolverKey = ((SimpleScalar) args.get(0)).getAsString();
        String path = ((SimpleScalar) args.get(1)).getAsString();
        String postFix = ((SimpleScalar) args.get(2)).getAsString();
        String completePath = path + "/" + resolverKey + "." + postFix;
        String resolverText = null;
        try {
            URL url = Resources.getResource(completePath);
            resolverText = Resources.toString(url, Charsets.UTF_8);
        } catch (IOException e) {
            e.printStackTrace();
            return "";
        }
        return ", " + resolverText.replaceFirst("=", ":");
    }
}

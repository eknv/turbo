package com.eknv.turbo.framework.freemarker;

import freemarker.template.SimpleScalar;
import freemarker.template.TemplateMethodModelEx;
import freemarker.template.TemplateModelException;
import org.apache.commons.lang.WordUtils;

import java.util.List;

public class ActionMethod implements TemplateMethodModelEx {
    public String exec(List args) throws TemplateModelException {
        if (args.size() != 1) {
            return "";
        }
        String relativeUrl = ((SimpleScalar) args.get(0)).getAsString();
/*        if (relativeUrl.contains("_")) {
            relativeUrl = relativeUrl.substring(relativeUrl.indexOf("_") + 1);
        }
        return relativeUrl;*/
        //return relativeUrl.replace("_", "&");
        return WordUtils.uncapitalize(WordUtils.capitalizeFully(relativeUrl, new char[]{'_'}).replaceAll("_", ""));
    }
}



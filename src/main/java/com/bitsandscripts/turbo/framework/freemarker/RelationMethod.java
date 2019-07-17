package com.eknv.turbo.framework.freemarker;

import freemarker.template.SimpleScalar;
import freemarker.template.TemplateMethodModelEx;
import freemarker.template.TemplateModelException;

import java.util.List;

public class RelationMethod implements TemplateMethodModelEx {
    private List<String> modelNames;

    public RelationMethod(List<String> modelNames) {
        this.modelNames = modelNames;
    }

    public Boolean exec(List args) throws TemplateModelException {
        if (args.size() != 1) {
            return false;
        }
        String fieldType = ((SimpleScalar) args.get(0)).getAsString();
        if (modelNames != null && modelNames.contains(fieldType)) {
            return true;
        }
        return false;
    }
}


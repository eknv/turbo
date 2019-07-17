package com.eknv.turbo.framework.freemarker;

import freemarker.template.*;

import java.util.List;

public class ConstraintTypeMethod implements TemplateMethodModelEx {
    private String constraintType;

    public ConstraintTypeMethod(String constraintType) {
        this.constraintType = constraintType;
    }

    public Boolean exec(List args) throws TemplateModelException {
        if (args.size() != 1) {
            return false;
        }
        SimpleSequence constraints = ((SimpleSequence) args.get(0));
        for(int i = 0; i<constraints.size(); i++) {
            TemplateModel templateModel = constraints.get(i);
            TemplateModel type = ((SimpleHash) templateModel).get("type");
            if(type!=null && type.toString().toLowerCase().equals(constraintType.toLowerCase())) {
                return true;
            }
        }
        return false;
    }
}


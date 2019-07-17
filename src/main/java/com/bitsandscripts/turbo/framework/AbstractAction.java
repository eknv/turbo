package com.eknv.turbo.framework;


import com.eknv.turbo.service.ActionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Transactional
@Component
public abstract class AbstractAction {

    @Autowired
    protected ApplicationContext applicationContext;

    protected ActionService Action;

    public abstract <T> T execute(Object... params) throws Exception;

    protected <T> T getBean(Class clazz) {
        return (T) applicationContext.getBean(StringUtils.uncapitalize(clazz.getSimpleName()));
    }

    protected <T> T getBean(String simpleClassName) {
        return (T) applicationContext.getBean(StringUtils.uncapitalize(simpleClassName));
    }

    public void setActionService(ActionService actionService) {
        Action = actionService;
    }
}

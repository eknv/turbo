package com.eknv.turbo.framework.entities;

import com.eknv.turbo.service.ActionService;
import org.hibernate.HibernateException;
import org.hibernate.engine.spi.SessionImplementor;
import org.hibernate.id.IdentifierGenerator;

import java.io.Serializable;

public class CustomIdentifier implements IdentifierGenerator {
    @Override
    public Serializable generate(SessionImplementor session, Object entity) throws HibernateException {
        ActionService actionService = ApplicationContextProvider.getBean(ActionService.class);
        if (!(entity instanceof IDProvider)) {
            throw new RuntimeException("The entity " +
                entity != null ? entity.getClass().getName() : "null" +
                " cannot use a custom generator!");
        }
        IDProvider idProvider = (IDProvider) entity;
        return actionService.execute(idProvider.getIdGeneratorName(), entity);
    }

}

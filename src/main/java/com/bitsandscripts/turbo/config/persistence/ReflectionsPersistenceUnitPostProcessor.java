package com.eknv.turbo.config.persistence;

import org.reflections.Reflections;
import org.reflections.scanners.SubTypesScanner;
import org.reflections.scanners.TypeAnnotationsScanner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.orm.jpa.persistenceunit.MutablePersistenceUnitInfo;
import org.springframework.orm.jpa.persistenceunit.PersistenceUnitPostProcessor;

import javax.persistence.Entity;
import javax.persistence.MappedSuperclass;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class ReflectionsPersistenceUnitPostProcessor implements PersistenceUnitPostProcessor {

    private List<String> reflectionsRoots;
    private Logger log = LoggerFactory.getLogger(ReflectionsPersistenceUnitPostProcessor.class);

    public ReflectionsPersistenceUnitPostProcessor(List<String> reflectionsRoots) {
        this.reflectionsRoots = reflectionsRoots;
    }

    @Override
    public void postProcessPersistenceUnitInfo(MutablePersistenceUnitInfo pui) {

        Set<Class<?>> entityClasses = new HashSet<>();
        Set<Class<?>> mappedSuperClasses = new HashSet<>();

        for (String reflectionsRoot : reflectionsRoots) {
            Reflections reflections = new Reflections(reflectionsRoot, new TypeAnnotationsScanner(), new SubTypesScanner());
            entityClasses.addAll(reflections.getTypesAnnotatedWith(Entity.class));
            mappedSuperClasses.addAll(reflections.getTypesAnnotatedWith(MappedSuperclass.class));
        }

        for (Class clzz : mappedSuperClasses) {
            pui.addManagedClassName(clzz.getName());
        }

        for (Class clzz : entityClasses) {
            pui.addManagedClassName(clzz.getName());
        }
    }

}

package com.eknv.turbo.config;

import com.eknv.turbo.framework.loaders.I18nServlet;
import com.eknv.turbo.framework.loaders.LoaderServlet;
import com.eknv.turbo.framework.servlet.StatesJsServlet;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.embedded.ServletRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ServletConfiguration {

    private final Logger log = LoggerFactory.getLogger(ServletConfiguration.class);


    @Bean
    public ServletRegistrationBean statesServletBean() {
        return new ServletRegistrationBean(new StatesJsServlet(), "/scripts/app/states.js");
    }

    @Bean
    public ServletRegistrationBean loaderServletBean() {
        return new ServletRegistrationBean(new LoaderServlet(), "/resource");
    }

    @Bean
    public ServletRegistrationBean i18nServletBean() {
        return new ServletRegistrationBean(new I18nServlet(), "/i18n");
    }

/*    @Bean
    public ServletRegistrationBean indexLoaderServletBean() {
        return new ServletRegistrationBean(new IndexLoaderServlet(), "/index.html");
    }*/

}

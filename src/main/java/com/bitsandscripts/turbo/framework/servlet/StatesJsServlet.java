package com.eknv.turbo.framework.servlet;

import com.eknv.turbo.config.DatabaseConfiguration;
import com.eknv.turbo.framework.Deployment;
import com.eknv.turbo.framework.freemarker.ActionMethod;
import com.eknv.turbo.framework.freemarker.ResolverMethod;
import com.eknv.turbo.util.WebUtil;
import com.google.gson.Gson;
import freemarker.template.Template;
import freemarker.template.TemplateException;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;
import org.springframework.web.context.WebApplicationContext;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.util.Map;

/**
 * Servlet implementation class StatesJsServlet
 */
@Component
public class StatesJsServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;


    private Deployment deployment;


    @Override
    public void init(ServletConfig config) throws ServletException {
        super.init();
        ApplicationContext applicationContext = (ApplicationContext) config.getServletContext().getAttribute(WebApplicationContext.ROOT_WEB_APPLICATION_CONTEXT_ATTRIBUTE);
        this.deployment = (Deployment) applicationContext.getBean("deployment");
    }


    /**
     * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse response)
     */
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {

        boolean isMobile = WebUtil.isMobile(request.getHeader("User-Agent"));
        response.setContentType("text/plain");
        PrintWriter responseWriter = response.getWriter();

        InputStream inputStream = DatabaseConfiguration.getResourceAsStream("config/states.json");
        Map jsonMap = new Gson().fromJson(new InputStreamReader(inputStream), Map.class);
        jsonMap.put("getResolver", new ResolverMethod());
        jsonMap.put("getAction", new ActionMethod());
        jsonMap.put("device", isMobile ? "mobile" : "desktop");
        jsonMap.put("release", deployment.isReleased() ? true : false);
        Template template = DatabaseConfiguration.getFreeMarker().getTemplate("_framework/templates/states.ftl");

        try {
            template.process(jsonMap, responseWriter);
        } catch (TemplateException e) {
            e.printStackTrace();
        }
    }


}


package com.eknv.turbo.framework.loaders;

import com.eknv.turbo.config.DatabaseConfiguration;
import org.apache.commons.io.IOUtils;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.InputStream;

/**
 * Servlet implementation class StatesJsServlet
 */
public class I18nServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    /**
     * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse response)
     */
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        response.setContentType("text/plain");
        String resource = request.getParameter("resource");
        InputStream inputStream = DatabaseConfiguration.getResourceAsStream("_app/i18n/" + resource);
        IOUtils.copy(inputStream, response.getOutputStream());
    }
}


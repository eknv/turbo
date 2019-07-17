package com.eknv.turbo.framework.loaders;

import com.eknv.turbo.util.WebUtil;

import javax.servlet.RequestDispatcher;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Servlet implementation class StatesJsServlet
 */
public class IndexLoaderServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    /**
     * @see HttpServlet#doGet(HttpServletRequest request, HttpServletResponse response)
     */
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {

        boolean isMobile = WebUtil.isMobile(request.getHeader("User-Agent"));

        RequestDispatcher view;
        if (isMobile) {
            view = request.getRequestDispatcher("/mobile.html");
        } else {
             view = request.getRequestDispatcher("/desktop.html");
        }

        view.forward(request, response);

    }


}


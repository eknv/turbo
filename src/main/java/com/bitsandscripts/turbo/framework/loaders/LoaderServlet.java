package com.eknv.turbo.framework.loaders;

import com.eknv.turbo.config.DatabaseConfiguration;
import com.eknv.turbo.framework.Deployment;
import com.eknv.turbo.util.GeneralUtil;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.io.filefilter.DirectoryFileFilter;
import org.apache.commons.io.filefilter.RegexFileFilter;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Component;
import org.springframework.web.context.WebApplicationContext;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.URLDecoder;
import java.util.*;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;

@Component
public class LoaderServlet extends HttpServlet {
  private static final long serialVersionUID = 1L;

  private Deployment deployment;
  private Map<String, String> components = new HashMap<>();

  @Override
  public void init(ServletConfig config) throws ServletException {
    super.init();
    ApplicationContext applicationContext = (ApplicationContext) config.getServletContext().getAttribute(WebApplicationContext.ROOT_WEB_APPLICATION_CONTEXT_ATTRIBUTE);
    this.deployment = (Deployment) applicationContext.getBean("deployment");
    getResourcesAsMap();
  }


  /**
   * @see javax.servlet.http.HttpServlet#doGet(javax.servlet.http.HttpServletRequest request, javax.servlet.http.HttpServletResponse response)
   */
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    response.setContentType("text/plain");
    String path = request.getParameter("path");
    String css = request.getParameter("app/css");
    String bower = request.getParameter("bower");
    String component = request.getParameter("component");
    String image = request.getParameter("image");
    String file = request.getParameter("file");
    String root = request.getParameter("root");

    if (!deployment.isProduction()) {
      getResourcesAsMap();
    }

    File app;
    try {
      app = new File(this.getClass().getResource("/_app").toURI());
    } catch (URISyntaxException e) {
      throw new RuntimeException(e);
    }

    StringBuilder absolutePath = new StringBuilder();

    /**
     * if a usecase is being loaded
     * the usecases have the following format usecase/usecase.abc.js
     * the part before slash "/" is used to find the actual path to the usecase
     * the part after slash "/" is then appended to the actual path
     */
    if (!GeneralUtil.isNullOrEmpty(component)) {
      String path2Component = components.get(component);
      absolutePath.append(path2Component);
    } else if (!GeneralUtil.isNullOrEmpty(bower)) {
      absolutePath.append(app.getParentFile().getParentFile().getParentFile().getPath())
        .append(File.separator).append("bower_components").append(File.separator);
      absolutePath.append(bower);
    } else if (!GeneralUtil.isNullOrEmpty(css)) {
      absolutePath.append(app.getParentFile().getPath()).append(File.separator).append("app/css").append(File.separator);
      absolutePath.append(css);
    } else if (!GeneralUtil.isNullOrEmpty(image)) {
      absolutePath.append(app.getParentFile().getPath()).append(File.separator).append("images").append(File.separator);
      absolutePath.append(image);
    } else if (!GeneralUtil.isNullOrEmpty(root)) {
      absolutePath.append(app.getParentFile().getPath()).append(File.separator);
      absolutePath.append(root);
    } else if (!GeneralUtil.isNullOrEmpty(file)) {
      absolutePath.append(app.getParentFile().getParentFile().getParentFile().getPath()).append(File.separator);
      absolutePath.append(file);
    }

    /**
     * if any other kind of path should be loaded, look in this folder: _app/_bl/usecases/
     * the "_" characters are then replaced by "/"
     */
    else {
/*      path = path.replace("$", "/");
      absolutePath.append(path);*/
      absolutePath.append(app.getParentFile().getParentFile().getParentFile().getPath())
        .append(File.separator).append("bower_components").append(File.separator);
      absolutePath.append(bower);
    }

    //InputStream inputStream = DatabaseConfiguration.getResourceAsStream(absolutePath.toString());
    String fileAbsolutePath = absolutePath.toString();

    if(fileAbsolutePath.endsWith("htm") || fileAbsolutePath.endsWith("html")) {
      response.setContentType("text/html");
    } else if(fileAbsolutePath.endsWith("js")) {
      response.setContentType("text/javascript");
    } else if(fileAbsolutePath.endsWith("app/css")) {
      response.setContentType("text/css");
    } else if(fileAbsolutePath.endsWith("png")) {
      response.setContentType("image/png");
    } else if(fileAbsolutePath.endsWith("jpg")) {
      response.setContentType("image/jpeg");
    }


    InputStream inputStream = new FileInputStream(fileAbsolutePath);


    /**
     * if it is not possible to find a path in the _app folder, then also try in the _framework folder
     */
    if (inputStream == null) {
      inputStream = DatabaseConfiguration.getResourceAsStream(fileAbsolutePath.replace("_app/", "_framework/"));
    }
    IOUtils.copy(inputStream, response.getOutputStream());

    /**
     * do not cache in debug mode
     */
    if (!deployment.isProduction()) {
      // Set to expire far in the past.
      response.setHeader("Expires", "Sat, 6 May 1995 12:00:00 GMT");
      // Set standard HTTP/1.1 no-cache headers.
      response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      // Set IE extended HTTP/1.1 no-cache headers (use addHeader).
      response.addHeader("Cache-Control", "post-check=0, pre-check=0");
      // Set standard HTTP/1.0 no-cache header.
      response.setHeader("Pragma", "no-cache");
    }
  }


  /**
   * this method fills resource maps listed below:
   * - usecases
   * - directives
   * this is useful in order to find the resources by their names.
   * this way, it is sufficient to pass the name of a directive, the framework knows where to find it, no matter where it is placed
   * todo/kn.. add validation.. throw exception if a usecase or directive name occurs more than once.. this is a bad error, system should throw exception and should stop working
   */
  private void getResourcesAsMap() {

    try {

      /**
       * fill in the components map
       */
      List<String> componentDirectories = Arrays.asList(
        "_app/_bl/components/", "_framework/_bl/components/"
      );


      for (String componentDirectory : componentDirectories) {
        Collection<File> resourceListing = getResourceListing(componentDirectory);
        for (File resourceFile : resourceListing) {
          if (!resourceFile.getAbsolutePath().endsWith(".htm")
            && !resourceFile.getAbsolutePath().endsWith(".html")
            && !resourceFile.getAbsolutePath().endsWith(".css")
            && !resourceFile.getAbsolutePath().endsWith(".js")) {
            continue;
          }
          components.put(resourceFile.getName(), resourceFile.getAbsolutePath());
        }
      }

      System.out.println(components.toString());

    } catch (Exception e) {
      e.printStackTrace();
    }
  }


  /**
   * List directory contents for a resource folder recursively.
   * This is basically a brute-force implementation.
   * Works for regular files and also JARs.
   *
   * @param path Should end with "/", but not start with one.
   */
  private Collection<File> getResourceListing(String path) throws URISyntaxException, IOException {
    URL dirURL = DatabaseConfiguration.getClassLoader().getResource(path);
    if (dirURL != null && dirURL.getProtocol().equals("file")) {
      Collection<File> files = FileUtils.listFiles(
        new File(dirURL.toURI()),
        new RegexFileFilter("^(.*?)"),
        DirectoryFileFilter.DIRECTORY
      );
      return files;
    }

    //todo/kn.. the part with the jar file has not been tested yet
    if (dirURL != null && dirURL.getProtocol().equals("jar")) {
        /* A JAR path */
      String jarPath = dirURL.getPath().substring(5, dirURL.getPath().indexOf("!")); //strip out only the JAR file
      JarFile jar = new JarFile(URLDecoder.decode(jarPath, "UTF-8"));
      Enumeration<JarEntry> entries = jar.entries(); //gives ALL entries in jar
      Set<File> result = new HashSet<File>(); //avoid duplicates in case it is a subdirectory
      while (entries.hasMoreElements()) {
        String name = entries.nextElement().getName();
        if (name.startsWith(path)) { //filter according to the path
          result.add(new File(name));
        }
      }
      return result;
    }

    throw new UnsupportedOperationException("Cannot list files for URL " + dirURL);
  }


}


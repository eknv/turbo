package com.eknv.turbo.security;

import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * Returns a 401 error code (Unauthorized) to the client, when Ajax authentication fails.
 */
@Component
public class AjaxAuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
                                        AuthenticationException exception) throws IOException, ServletException {

        if(exception.getCause() instanceof ServerInMaintenanceModeException) {
            response.sendError(HttpServletResponse.SC_SERVICE_UNAVAILABLE, exception.getMessage());
            return;
        }

        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Authentication failed");
    }
}

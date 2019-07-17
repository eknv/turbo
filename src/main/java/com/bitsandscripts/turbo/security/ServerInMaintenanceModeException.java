package com.eknv.turbo.security;

import org.springframework.security.core.AuthenticationException;

/**
 * Server is in maintenance mode
 */
public class ServerInMaintenanceModeException extends AuthenticationException {

    public ServerInMaintenanceModeException(String message) {
        super(message);
    }

    public ServerInMaintenanceModeException(String message, Throwable t) {
        super(message, t);
    }
}

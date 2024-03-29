package com.eknv.turbo.security;

import com.eknv.turbo.domain.Authority;
import com.eknv.turbo.domain.User;
import com.eknv.turbo.framework.Deployment;
import com.eknv.turbo.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.inject.Inject;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Authenticate a user from the database.
 */
@Component("userDetailsService")
public class UserDetailsService implements org.springframework.security.core.userdetails.UserDetailsService {

    private final Logger log = LoggerFactory.getLogger(UserDetailsService.class);

    @Inject
    private UserRepository userRepository;

    @Inject
    private Deployment deployment;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(final String login) {
        log.debug("Authenticating {}", login);


        String lowercaseLogin = login.toLowerCase();
        Optional<User> userFromDatabase = userRepository.findOneByLogin(lowercaseLogin);
        return userFromDatabase.map(user -> {
            if (!user.getActivated()) {
                throw new UserNotActivatedException("User " + lowercaseLogin + " was not activated");
            }

            Set<Authority> authorities = user.getAuthorities();
            List<GrantedAuthority> grantedAuthorities = authorities.stream()
                .map(authority -> new SimpleGrantedAuthority(authority.getName()))
                .collect(Collectors.toList());

            boolean isAdmin = false;
            for (Authority authority : authorities) {
                if(authority.getName().equals(AuthoritiesConstants.ADMIN)) {
                    isAdmin=true;
                    break;
                }
            }

            if (!isAdmin && !deployment.isReleased()) {
                throw new ServerInMaintenanceModeException("Server is currently in maintenace mode");
            }

            return new org.springframework.security.core.userdetails.User(lowercaseLogin,
                user.getPassword(),
                grantedAuthorities);
        }).orElseThrow(() -> new UsernameNotFoundException("User " + lowercaseLogin + " was not found in the database"));
    }
}

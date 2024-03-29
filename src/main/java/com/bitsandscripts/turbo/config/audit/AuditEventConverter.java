package com.eknv.turbo.config.audit;

import com.eknv.turbo.domain.PersistentAuditEvent;
import org.springframework.boot.actuate.audit.AuditEvent;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.web.authentication.WebAuthenticationDetails;

import java.time.ZoneId;
import java.util.*;

@Configuration
public class AuditEventConverter {

    /**
     * Convert a list of PersistentAuditEvent to a list of AuditEvent
     * @param persistentAuditEvents the list to convert
     * @return the converted list.
     */
    public List<AuditEvent> convertToAuditEvent(Iterable<PersistentAuditEvent> persistentAuditEvents) {
        if (persistentAuditEvents == null) {
            return Collections.emptyList();
        }

        List<AuditEvent> auditEvents = new ArrayList<>();

        for (PersistentAuditEvent persistentAuditEvent : persistentAuditEvents) {
            Date date = Date.from(persistentAuditEvent.getAuditEventDate().atZone(ZoneId.systemDefault()).toInstant());
            AuditEvent auditEvent = new AuditEvent(date, persistentAuditEvent.getPrincipal(),
                    persistentAuditEvent.getAuditEventType(), convertDataToObjects(persistentAuditEvent.getData()));
            auditEvents.add(auditEvent);
        }

        return auditEvents;
    }

    /**
     * Internal conversion. This is needed to support the current SpringBoot actuator AuditEventRepository interface
     *
     * @param data the data to convert
     * @return a map of String, Object
     */
    public Map<String, Object> convertDataToObjects(Map<String, String> data) {
        Map<String, Object> results = new HashMap<>();

        if (data != null) {
            for (String key : data.keySet()) {
                results.put(key, data.get(key));
            }
        }

        return results;
    }

    /**
     * Internal conversion. This method will allow to save additionnals data.
     * By default, it will save the object as string
     *
     * @param data the data to convert
     * @return a map of String, String
     */
    public Map<String, String> convertDataToStrings(Map<String, Object> data) {
        Map<String, String> results = new HashMap<>();

        if (data != null) {
            for (String key : data.keySet()) {
                Object object = data.get(key);

                // Extract the data that will be saved.
                if (object instanceof WebAuthenticationDetails) {
                    WebAuthenticationDetails authenticationDetails = (WebAuthenticationDetails) object;
                    results.put("remoteAddress", authenticationDetails.getRemoteAddress());
                    results.put("sessionId", authenticationDetails.getSessionId());
                } else {
                    results.put(key, object.toString());
                }
            }
        }

        return results;
    }
}

package com.eknv.turbo.web.rest;

import com.eknv.turbo.service.ActionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ActionResource {

    @Autowired
    private ActionService actionService;

    @RequestMapping(value = "/action", method = RequestMethod.POST,
      consumes = MediaType.APPLICATION_JSON_VALUE,
      produces = MediaType.APPLICATION_JSON_VALUE
    )
    @ResponseBody
    @Transactional
    Object action(@RequestBody Object map) {
        String actionName = (String) ((LinkedHashMap) map).get("actionName");
        List params = (List) ((LinkedHashMap) map).get("params");
        Object returnValue = execute(actionName, false, params != null ? params.toArray() : null);
        Map result = null;
        try {
            result = wrapInMap(returnValue);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }

    @RequestMapping(value = "/paction", method = RequestMethod.POST,
      consumes = MediaType.APPLICATION_JSON_VALUE,
      produces = MediaType.APPLICATION_JSON_VALUE
    )
    @ResponseBody
    @Transactional
    Object paction(@RequestBody Object map) {
        String actionName = (String) ((LinkedHashMap) map).get("actionName");
        List params = (List) ((LinkedHashMap) map).get("params");
        Object returnValue = execute(actionName, true, params != null ? params.toArray() : null);
        Map result = null;
        try {
            result = wrapInMap(returnValue);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return result;
    }


    private Object execute(String actionName, boolean isPublic, Object[] values) {
        if (values == null || values.length == 0) {
            return run(actionName, isPublic);
        } else if (values.length == 1) {
            return run(actionName, isPublic, values[0]);
        } else if (values.length == 2) {
            return run(actionName, isPublic, values[0], values[1]);
        } else if (values.length == 3) {
            return run(actionName, isPublic, values[0], values[1], values[2]);
        } else if (values.length == 4) {
            return run(actionName, isPublic, values[0], values[1], values[2], values[3]);
        } else if (values.length == 5) {
            return run(actionName, isPublic, values[0], values[1], values[2], values[3], values[4]);
        } else if (values.length == 6) {
            return run(actionName, isPublic, values[0], values[1], values[2], values[3], values[4], values[5]);
        } else if (values.length == 7) {
            return run(actionName, isPublic, values[0], values[1], values[2], values[3], values[4], values[5],
                values[6]);
        } else if (values.length == 8) {
            return run(actionName, isPublic, values[0], values[1], values[2], values[3], values[4], values[5],
                values[6], values[7]);
        } else if (values.length == 9) {
            return run(actionName, isPublic, values[0], values[1], values[2], values[3], values[4], values[5],
                values[6], values[7], values[8]);
        } else if (values.length == 10) {
            return run(actionName, isPublic, values[0], values[1], values[2], values[3], values[4], values[5],
                values[6], values[7], values[8], values[9]);
        } else if (values.length == 11) {
            return run(actionName, isPublic, values[0], values[1], values[2], values[3], values[4], values[5],
                values[6], values[7], values[8], values[9], values[10]);
        } else if (values.length == 12) {
            return run(actionName, isPublic, values[0], values[1], values[2], values[3], values[4], values[5],
                values[6], values[7], values[8], values[9], values[10], values[11]);
        } else if (values.length == 13) {
            return run(actionName, isPublic, values[0], values[1], values[2], values[3], values[4], values[5],
                values[6], values[7], values[8], values[9], values[10], values[11], values[12]);
        } else if (values.length == 14) {
            return run(actionName, isPublic, values[0], values[1], values[2], values[3], values[4], values[5],
                values[6], values[7], values[8], values[9], values[10], values[11], values[12], values[13]);
        } else if (values.length == 15) {
            return run(actionName, isPublic, values[0], values[1], values[2], values[3], values[4], values[5],
                values[6], values[7], values[8], values[9], values[10], values[11], values[12], values[13], values[14]);
        } else {
            throw new RuntimeException(String.format("%d arguments are passed to method %s but currently just %d are supported.",
                values.length, actionName, 15));
        }
    }


    private Object run(String actionName, boolean isPublic, Object... params) {
        if (isPublic) {
            return actionService.executePublic(actionName, params);
        } else {
            return actionService.execute(actionName, params);
        }
    }


    private Map wrapInMap(Object value) {
        return new HashMap<String, Object>() {{
            put("value", value);
        }};
    }

}

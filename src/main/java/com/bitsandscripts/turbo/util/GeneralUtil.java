package com.eknv.turbo.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import jdk.nashorn.api.scripting.JSObject;
import jdk.nashorn.internal.runtime.Undefined;

import java.lang.reflect.Array;
import java.util.Collection;
import java.util.Map;

public final class GeneralUtil {

    private GeneralUtil() {
    }

    public static boolean isArray(Object obj) {
        return obj != null && obj.getClass().isArray();
    }

    public static boolean isNull(Object object) {
        return object == null || object instanceof Undefined;
    }

    public static boolean isNullOrEmpty(Object object) {
        if (isNull(object)) {
            return true;
        } else if (object instanceof Map) {
            return isNullOrEmpty((Map) object);
        } else if (object instanceof Collection) {
            return isNullOrEmpty((Collection) object);
        } else if (isArray(object)) {
            return Array.getLength(object) == 0;
        } else if (object instanceof String) {
            return isNullOrEmpty((String) object);
        }
        return false;
    }

    public static boolean isNullOrEmpty(Collection collection) {
        return isNull(collection) || collection.size() == 0;
    }

    public static boolean isNullOrEmpty(String string) {
        return isNull(string) || string.trim().isEmpty();
    }

    public static boolean isNullOrEmpty(Map map) {
        return isNull(map) || map.isEmpty();
    }

    public static boolean isCollection(Object object) {
        return object instanceof Collection;
    }

    public static boolean isJSObject(Object object) {
        return object instanceof JSObject;
    }

    public static boolean isException(Object object) {
        return object instanceof Throwable;
    }

    public static boolean isTrue(String stringValue) {
        if (isNull(stringValue)) {
            return false;
        }
        if (stringValue.toUpperCase().equals("Y")
                || stringValue.toUpperCase().equals("Y")) {
            return true;
        }
        return false;
    }


    public static String toJson(Object object) {
        String json = null;
        try {
            ObjectWriter ow = new ObjectMapper().writer().withDefaultPrettyPrinter();
            json = ow.writeValueAsString(object);
        } catch (JsonProcessingException e) {
            e.printStackTrace();
        }
        return json;
    }

}

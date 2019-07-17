package com.eknv.turbo.util;

public final class WebUtil {

    private WebUtil() {
    }

    public static boolean isMobile(String header) {

        //if(true) return true;

        if (header == null) {
            return false;
        }
        return header.indexOf("Mobi") != -1;
    }

}

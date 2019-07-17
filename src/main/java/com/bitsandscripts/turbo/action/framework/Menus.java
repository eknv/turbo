package com.eknv.turbo.action.framework;


import com.eknv.turbo.config.DatabaseConfiguration;
import com.eknv.turbo.framework.AbstractAction;
import com.google.gson.Gson;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.Map;

/**
 * This action loads and returns the menu json
 */
@Component
public class Menus extends AbstractAction {

    @Override
    public Object execute(Object... params) {
        InputStream inputStream = DatabaseConfiguration.getResourceAsStream("config/menus.json");
        Map jsonMap = new Gson().fromJson(new InputStreamReader(inputStream), Map.class);
        return jsonMap;
    }

}

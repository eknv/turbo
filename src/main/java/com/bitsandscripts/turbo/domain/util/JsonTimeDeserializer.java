package com.eknv.turbo.domain.util;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import java.io.IOException;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

public class JsonTimeDeserializer extends JsonDeserializer<LocalTime> {

    private DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm:ss");

    @Override
    public LocalTime deserialize(JsonParser jsonparser,
                                 DeserializationContext deserializationcontext) throws IOException {
        try {
            return LocalTime.parse(jsonparser.getText(), timeFormatter);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

}

package com.eknv.turbo.domain.util;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class JsonDateTimeDeserializer extends JsonDeserializer<LocalDateTime> {

    private DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public LocalDateTime deserialize(JsonParser jsonparser, DeserializationContext deserializationcontext) throws IOException {
        try {
            return LocalDateTime.parse(jsonparser.getText(), dateTimeFormatter);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

}

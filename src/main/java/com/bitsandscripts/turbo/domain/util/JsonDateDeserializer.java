package com.eknv.turbo.domain.util;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

public class JsonDateDeserializer extends JsonDeserializer<LocalDate> {

    private DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Override
    public LocalDate deserialize(JsonParser jsonparser,
                                 DeserializationContext deserializationcontext) throws IOException {
        try {
            return LocalDate.parse(jsonparser.getText(), dateFormatter);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

}

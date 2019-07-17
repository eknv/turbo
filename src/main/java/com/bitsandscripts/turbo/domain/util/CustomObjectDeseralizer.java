package com.eknv.turbo.domain.util;

import com.eknv.turbo.util.Constants;
import com.eknv.turbo.util.DateUtil;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonTokenId;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.deser.std.UntypedObjectDeserializer;

import java.io.IOException;
import java.math.BigDecimal;

public class CustomObjectDeseralizer extends UntypedObjectDeserializer {

    private static final long serialVersionUID = 1L;
    private DateUtil dateUtil = DateUtil.INSTANCE;

    @Override
    public Object deserialize(JsonParser jp, DeserializationContext ctxt) throws IOException {

        if (jp.getCurrentTokenId() == JsonTokenId.ID_STRING) {
            try {
                if (jp.getText() != null && jp.getText().startsWith(com.eknv.turbo.util.Constants.DATE_PREFIX)) {
                    return dateUtil.localDate(jp.getText().substring(Constants.DATE_PREFIX.length(), jp.getText().length()));
                } else if (jp.getText() != null && jp.getText().startsWith(Constants.TIME_PREFIX)) {
                    return dateUtil.localTime(jp.getText().substring(Constants.TIME_PREFIX.length(), jp.getText().length()));
                } else if (jp.getText() != null && jp.getText().startsWith(Constants.DATETIME_PREFIX)) {
                    return dateUtil.localDateTime(jp.getText().substring(Constants.DATETIME_PREFIX.length(), jp.getText().length()));
                } else if (jp.getText() != null && jp.getText().startsWith(Constants.DECIMAL_PREFIX)) {
                    String decimalString = jp.getText().substring(Constants.DECIMAL_PREFIX.length(), jp.getText().length());
                    return new BigDecimal(decimalString);
                } else if (jp.getText() != null && jp.getText().startsWith(Constants.INTEGER_PREFIX)) {
                    String integerString = jp.getText().substring(Constants.INTEGER_PREFIX.length(), jp.getText().length());
                    return Long.valueOf(integerString);
                } else {
                    return super.deserialize(jp, ctxt);
                }
            } catch (Exception e) {
                return super.deserialize(jp, ctxt);
            }
        } else {
            return super.deserialize(jp, ctxt);
        }
    }
}

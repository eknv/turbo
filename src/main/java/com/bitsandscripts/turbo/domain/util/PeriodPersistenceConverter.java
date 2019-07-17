package com.eknv.turbo.domain.util;

import javax.persistence.AttributeConverter;
import javax.persistence.Converter;
import java.time.Period;
import java.util.Objects;

@Converter(autoApply = true)
public class PeriodPersistenceConverter implements AttributeConverter<Period, String> {

    /**
    * @return an ISO-8601 representation of this duration.
    * @see Period#toString()
    */
    @Override
    public String convertToDatabaseColumn(Period entityValue) {
        return Objects.toString(entityValue, null);
    }

    @Override
    public Period convertToEntityAttribute(String databaseValue) {
        return Period.parse(databaseValue);
    }
}

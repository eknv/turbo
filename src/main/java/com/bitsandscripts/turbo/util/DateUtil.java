package com.eknv.turbo.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

public final class DateUtil {

    private final static DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private final static DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private final static DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("H:mm");
    private final static DateTimeFormatter TIME_FORMATTER_2 = DateTimeFormatter.ofPattern("HH:mm");

    public static final DateUtil INSTANCE = new DateUtil();

    private DateUtil() {
    }

    public LocalDate localDate(String localDate) throws Exception {
        return LocalDate.parse(localDate, DATE_FORMATTER);
    }

    public LocalDateTime localDateTime(String localDateTime) {
        return LocalDateTime.parse(localDateTime, DATE_TIME_FORMATTER);
    }

    public LocalTime localTime(String localTime) {
        try {
            return LocalTime.parse(localTime, TIME_FORMATTER);
        } catch (Exception e) {
            return LocalTime.parse(localTime, TIME_FORMATTER_2);
        }
    }

}

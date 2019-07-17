package com.eknv.turbo.domain.util;

import org.hibernate.HibernateException;
import org.hibernate.engine.spi.SessionImplementor;
import org.hibernate.usertype.UserType;

import java.io.Serializable;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;


public class TurboBooleanType implements UserType {

    @Override
    public int[] sqlTypes() {
        return new int[]{Types.BIT};
    }

    @SuppressWarnings("rawtypes")
    @Override
    public Class returnedClass() {
        return Boolean.class;
    }

    @Override
    public boolean equals(final Object x, final Object y) throws HibernateException {
        if ((x == null && y == null)) {
            return true;
        }
        if (x == null || y == null) {
            return false;
        } else {
            return x.equals(y);
        }
    }

    @Override
    public int hashCode(final Object x) throws HibernateException {
        assert (x != null);
        return x.hashCode();
    }

    @Override
    public Object nullSafeGet(final ResultSet rs, final String[] names, final SessionImplementor session, final Object owner) throws HibernateException, SQLException {
        final Boolean b = rs.getBoolean(names[0]);
        if (b == null || Boolean.FALSE.equals(b)) {
            return Boolean.FALSE;
        } else {
            return Boolean.TRUE;
        }
    }

    @Override
    public void nullSafeSet(final PreparedStatement st, final Object value, final int index, final SessionImplementor session) throws HibernateException, SQLException {
        Boolean b = Boolean.TRUE;
        if (value == null || !((Boolean) value)) {
            b = Boolean.FALSE;
        }
        st.setBoolean(index, b);
    }

    @Override
    public Object deepCopy(final Object value) throws HibernateException {
        return value;
    }

    @Override
    public boolean isMutable() {
        return false;
    }

    @Override
    public Serializable disassemble(final Object value) throws HibernateException {
        return (Serializable) value;
    }

    @Override
    public Object assemble(final Serializable cached, final Object owner) throws HibernateException {
        return cached;
    }

    @Override
    public Object replace(final Object original, final Object target, final Object owner) throws HibernateException {
        return original;
    }
}

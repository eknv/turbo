package com.eknv.turbo.domain.util;

import com.eknv.turbo.domain.TurboID;
import com.eknv.turbo.util.GeneralUtil;
import org.hibernate.HibernateException;
import org.hibernate.LockOptions;
import org.hibernate.Query;
import org.hibernate.engine.spi.SessionImplementor;
import org.hibernate.id.IdentifierGenerator;
import org.hibernate.internal.SessionImpl;

import java.io.Serializable;
import java.util.List;

public class TurboIdGenerator implements IdentifierGenerator {

    private static Long MAX_LOW = 4096L;
    private static Long currentId = 0L;
    private static Long currentHigh;

    public static Long getMaxLow() {
        return MAX_LOW;
    }

    public static void setMaxLow(Long maxLow) {
        MAX_LOW = maxLow;
    }

    public Serializable generate(SessionImplementor sessionImplementor, Object object)
            throws HibernateException {
        synchronized (currentId) {
            /**
             * if the current-high has not been initialized, initialize it first
             */
            if (currentHigh == null
                    || (currentId > (currentHigh + 1) * MAX_LOW)) {
                currentHigh = getNextHigh((SessionImpl) sessionImplementor);
                currentId = currentHigh * MAX_LOW + 1;
            }
            return currentId++;
        }
    }


    private Long getNextHigh(SessionImpl session) {
        Long currentHigh = null;

        Query query = session.createQuery("from com.eknv.turbo.domain.TurboID");
        query.setLockOptions(LockOptions.UPGRADE);
        query.setCacheable(false);
        List<TurboID> turboIds = query.list();

        /**
         * create a new entry and save it
         */
        if (GeneralUtil.isNullOrEmpty(turboIds)) {
            currentHigh = 0L;
            TurboID turboID = new TurboID();
            turboID.setDummyId(1L);
            turboID.setNextHigh(1L);
            session.saveOrUpdate(turboID);
        } else if (turboIds.size() > 1) {
            throw new RuntimeException("There should be just one TurboId entity");
        } else {
            TurboID turboID = turboIds.get(0);
            currentHigh = turboID.getNextHigh();
            turboID.setNextHigh(currentHigh + 1);
            session.saveOrUpdate(turboID);
        }
        session.flush();

        return currentHigh;
    }

}

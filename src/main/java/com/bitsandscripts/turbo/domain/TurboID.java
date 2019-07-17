package com.eknv.turbo.domain;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import java.io.Serializable;


@Entity
@Table(name = "TURBO_ID")
public class TurboID implements Serializable {

    @Id
    @Column(name = "dummy_id")
    Long dummyId;

    @Column(name = "next_high")
    private Long nextHigh;

    public Long getNextHigh() {
        return nextHigh;
    }

    public void setNextHigh(Long nextHigh) {
        this.nextHigh = nextHigh;
    }

    public Long getDummyId() {
        return dummyId;
    }

    public void setDummyId(Long dummyId) {
        this.dummyId = dummyId;
    }
}


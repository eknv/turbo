package com.eknv.turbo.domain;

import org.hibernate.annotations.GenericGenerator;
import org.hibernate.annotations.Type;

import javax.persistence.*;
import java.io.Serializable;

/**
 * design data
 */
@Entity
@Table(name = "design_data")
public class DesignData extends AbstractAuditingEntity implements Serializable {

    @Id
    @GenericGenerator(name = "turbo_id_generator", strategy = "com.eknv.turbo.domain.util.TurboIdGenerator")
    @GeneratedValue(generator = "turbo_id_generator")
    private Long id;

    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "data")
    @Type(type = "text")
    private String data;


    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getVersion() {
        return version;
    }

    public void setVersion(Long version) {
        this.version = version;
    }

    public String getData() {
        return data;
    }

    public void setData(String data) {
        this.data = data;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }

        DesignData designData = (DesignData) o;

        if (!version.equals(designData.version)) {
            return false;
        }

        return true;
    }

    @Override
    public int hashCode() {
        return version.hashCode();
    }

    @Override
    public String toString() {
        return "DesignData{" +
                "version='" + version + '\'' +
                "}";
    }
}

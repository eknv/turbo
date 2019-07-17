package ${packageName};

import com.eknv.turbo.domain.util.LocalDateTimeUserType;
import com.eknv.turbo.domain.util.LocalDateUserType;
import com.eknv.turbo.domain.util.LocalTimeUserType;
import com.fasterxml.jackson.annotation.JsonGetter;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.eknv.turbo.domain.util.JsonDateSerializer;
import com.eknv.turbo.domain.util.JsonDateDeserializer;
import com.eknv.turbo.domain.util.JsonDateTimeSerializer;
import com.eknv.turbo.domain.util.JsonDateTimeDeserializer;
import com.eknv.turbo.domain.util.JsonTimeSerializer;
import com.eknv.turbo.domain.util.JsonTimeDeserializer;

import java.io.Serializable;
import org.hibernate.annotations.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.math.*;
import java.lang.*;
import javax.persistence.*;
import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.EntityListeners;
import javax.persistence.MappedSuperclass;
import org.hibernate.annotations.Parameter;
import javax.persistence.Table;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.Type;
import org.hibernate.envers.Audited;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.hibernate.annotations.Type;
import com.eknv.turbo.domain.util.TurboBooleanType;
import com.eknv.turbo.framework.entities.IDProvider;
import javax.persistence.Index;


/**
* Base abstract class for entities which will hold definitions for created, last modified by and created,
* last modified by date.
*/

<#list model.fields as field>
    <#if field.props.type?has_content && field.props.type?lower_case='id'
    && field.props.id_generator?has_content && field.props.id_generator="custom">
        <#assign idGeneratorName = "${field.props.id_generatorName}">
    </#if>
</#list>


<#assign hasId = false>

@Entity
<#if model.audited?has_content && model.audited=true>
@Audited
@EntityListeners({AuditingEntityListener.class})
</#if>

<#if model.name?has_content>
    <#assign hasIndex = false>
    <#assign hasUnique = false>
@Table(name = "`${model.name}`"
    <#if model.constraints?has_content>
        <#if hasIndexes(model.constraints)>
        , indexes = {
            <#list model.constraints as constraint>
                <#if constraint.type?has_content && constraint.type?lower_case='index'>
                    <#if hasIndex=true>,</#if>
                    <#assign hasIndex = true>
                @Index(name = "${constraint.name}", columnList = " <#list constraint.fields as field> `${field}` <#if field?has_next>,</#if> </#list>")
                </#if>
            </#list>
        }
        </#if>
        <#if hasUniqueConstraints(model.constraints)>
        , uniqueConstraints = {
            <#list model.constraints as constraint>
                <#if constraint.type?has_content && constraint.type?lower_case='unique'>
                    <#if hasUnique=true>,</#if>
                    <#assign hasUnique = true>
                @UniqueConstraint(name = "${constraint.name}", columnNames = {
                    <#list constraint.fields as field>
                    "`${field}`" <#if field?has_next>,</#if>
                    </#list>
                })
                </#if>
            </#list>
        }
        </#if>
    </#if>
)
</#if>

public
<#if model.isAbstract?has_content>
abstract
</#if>
class ${model.name}
implements Cloneable, Serializable
<#if idGeneratorName?has_content>
, IDProvider
</#if>
{
<#if model.version?has_content>
private static final long serialVersionUID = ${model.version}L;
<#else>
private static final long serialVersionUID = 1L;
</#if>

<#list model.fields as field>

<#--Fields -->
    <#if field.props.type?has_content && field.props.type?lower_case='createdby'>
    @CreatedBy
    @NotNull
    @Column(name = <#if field.name?has_content> "`${field.name}`" <#else> "`created_by`" </#if>, nullable = false, length = 50, updatable = false)
    private String createdBy;

    <#elseif field.props.type?has_content && field.props.type?lower_case='createddate'>
    @CreatedDate
    @NotNull
    @Type(type="com.eknv.turbo.domain.util.LocalDateTimeUserType")
    @Column(name = <#if field.name?has_content> "`${field.name}`" <#else> "`created_date`" </#if>, nullable = false)
    @JsonSerialize(using = JsonDateTimeSerializer.class)
    @JsonDeserialize(using = JsonDateTimeDeserializer.class)
    private LocalDateTime createdDate = LocalDateTime.now();

    <#elseif field.props.type?has_content && field.props.type?lower_case='lastmodifiedby'>
    @LastModifiedBy
    @Column(name = <#if field.name?has_content> "`${field.name}`" <#else> "`last_modified_by`" </#if>, length = 50)
    private String lastModifiedBy;

    <#elseif field.props.type?has_content && field.props.type?lower_case='lastmodifieddate'>
    @LastModifiedDate
    @Column(name = <#if field.name?has_content> "`${field.name}`" <#else> "`last_modified_date`" </#if>)
    @Type(type="com.eknv.turbo.domain.util.LocalDateTimeUserType")
    @JsonSerialize(using = JsonDateTimeSerializer.class)
    @JsonDeserialize(using = JsonDateTimeDeserializer.class)
    private LocalDateTime lastModifiedDate = LocalDateTime.now();

    <#elseif field.props.type?has_content && field.props.type?lower_case='id'>
        <#assign hasId = true>
    @Id
    @GenericGenerator(name = "turbo_id_generator", strategy = "com.eknv.turbo.domain.util.TurboIdGenerator")
    @GeneratedValue(generator = "turbo_id_generator")
        <#if field.name?has_content>
            <#assign idName = "${field.name}">
        <#else>
            <#assign idName = "id">
        </#if>

        <#if field.name?has_content && field.props.length?has_content>
        @Column(name = "`${field.name}`", length = ${field.props.length})
        <#elseif field.name?has_content>
        @Column(name = "`${field.name}`")
        <#elseif field.props.length?has_content>
        @Column(length = ${field.props.length})
        </#if>
    private Long ${idName};

    <#elseif isRelationshipType(field.props.type)>

        <#if field.props.rel_type?has_content && field.props.rel_type?lower_case='manytoone'>
        @ManyToOne
        private ${field.props.type} ${field.name};

        <#elseif field.props.rel_type?has_content && field.props.rel_type?lower_case='onetoone'>

            <#if field.props.rel_mappedBy?has_content>
            @OneToOne(mappedBy = "${field.props.rel_mappedBy}")
            <#elseif field.props.rel_cascade?has_content>
            @OneToOne(
                <#if field.props.rel_eager?has_content && field.props.rel_eager=true>
                fetch = FetchType.EAGER
                    <#if field.props.rel_cascade?has_content>,</#if>
                </#if>
                <#if field.props.rel_cascade?has_content>
                    <#if field.props.rel_cascade?lower_case='all'>
                    cascade = CascadeType.ALL
                    <#elseif field.props.rel_cascade?lower_case='persist'>
                    cascade = CascadeType.PERSIST
                    <#elseif field.props.rel_cascade?lower_case='merge'>
                    cascade = CascadeType.MERGE
                    <#elseif field.props.rel_cascade?lower_case='remove'>
                    cascade = CascadeType.REMOVE
                    <#elseif field.props.rel_cascade?lower_case='refresh'>
                    cascade = CascadeType.REFRESH
                    <#elseif field.props.rel_cascade?lower_case='detach'>
                    cascade = CascadeType.DETACH
                    </#if>
                </#if>
            )
            <#else>
            @OneToOne
            </#if>
        private ${field.props.type} ${field.name};

        <#elseif field.props.rel_type?has_content && field.props.rel_type?lower_case='onetomany'>
        @OneToMany(
            <#if field.props.rel_mappedBy?has_content>
            mappedBy = "${field.props.rel_mappedBy}"
            <#else>
            mappedBy = "${model.name?uncap_first}"
            </#if>
            <#if field.props.rel_eager?has_content && field.props.rel_eager=true>
            , fetch = FetchType.EAGER
            </#if>

            <#if field.props.rel_cascade?has_content>
                <#if field.props.rel_cascade?lower_case='all'>
                , cascade = CascadeType.ALL
                <#elseif field.props.rel_cascade?lower_case='persist'>
                , cascade = CascadeType.PERSIST
                <#elseif field.props.rel_cascade?lower_case='merge'>
                , cascade = CascadeType.MERGE
                <#elseif field.props.rel_cascade?lower_case='remove'>
                , cascade = CascadeType.REMOVE
                <#elseif field.props.rel_cascade?lower_case='refresh'>
                , cascade = CascadeType.REFRESH
                <#elseif field.props.rel_cascade?lower_case='detach'>
                , cascade = CascadeType.DETACH
                </#if>
            </#if>

            <#if field.props.rel_orphanRemoval?has_content && field.props.rel_orphanRemoval=true>
            , orphanRemoval = true
            </#if>
        )


            <#if field.props.rel_mapKey?has_content>
            @MapKey(name="${field.props.rel_mapKey}")
            private Map
            <Object, ${field.props.type}> ${field.name} = new HashMap<>();
            <#else>
                <#if field.props.rel_orderBy?has_content>
                @OrderBy("${field.props.rel_orderBy}")
                private List<${field.props.type}> ${field.name} = new ArrayList<>();
                <#else>
                private Set<${field.props.type}> ${field.name} = new HashSet<>();
                </#if>
            </#if>

        <#elseif field.props.rel_type?has_content && field.props.rel_type?lower_case='manytomany'>

            <#if field.props.rel_mappedBy?has_content>
            @ManyToMany(mappedBy = "${field.props.rel_mappedBy}")
            <#else>
            @ManyToMany
            (
                <#if field.props.rel_eager?has_content && field.props.rel_eager=true>
                fetch = FetchType.EAGER
                <#else>
                fetch = FetchType.LAZY
                </#if>
                <#if field.props.rel_cascade?has_content>
                    <#if field.props.rel_cascade?lower_case='all'>
                    , cascade = CascadeType.ALL
                    <#elseif field.props.rel_cascade?lower_case='persist'>
                    , cascade = CascadeType.PERSIST
                    <#elseif field.props.rel_cascade?lower_case='merge'>
                    , cascade = CascadeType.MERGE
                    <#elseif field.props.rel_cascade?lower_case='remove'>
                    , cascade = CascadeType.REMOVE
                    <#elseif field.props.rel_cascade?lower_case='refresh'>
                    , cascade = CascadeType.REFRESH
                    <#elseif field.props.rel_cascade?lower_case='detach'>
                    , cascade = CascadeType.DETACH
                    </#if>
                </#if>
            )
            @JoinTable(
                <#if field.props.rel_JoinTable?has_content>
                name = "${field.props.rel_JoinTable}"
                <#else>
                name = "${model.name?upper_case}_${field.props.type?upper_case}"
                </#if>
            ,joinColumns = {
                <#if field.props.rel_joinColumns?has_content>
                    <#list field.props.rel_joinColumns as joinColumn>
                    @JoinColumn(name = "JC${joinColumn?counter}_${joinColumn?upper_case}", referencedColumnName = "${joinColumn?upper_case}")
                        <#if joinColumn?has_next>,</#if>
                    </#list>
                <#else>
                @JoinColumn(name = "${model.name?upper_case}_ID")
                </#if>
            }

            ,inverseJoinColumns = {
                <#if field.props.rel_inverseJoinColumns?has_content>
                    <#list field.props.rel_inverseJoinColumns as inverseJoinColumn>
                    @JoinColumn(name = "IJC${inverseJoinColumn?counter}_${inverseJoinColumn?upper_case}", referencedColumnName = "${inverseJoinColumn?upper_case}")
                        <#if inverseJoinColumn?has_next>,</#if>
                    </#list>
                <#else>
                @JoinColumn(name = "${field.props.type?upper_case}_ID")
                </#if>
            }
            )
            </#if>
        private Set<${field.props.type}> ${field.name} = new HashSet<${field.props.type}>();
        </#if>

    <#elseif field.props.rel_type?has_content && field.props.rel_type?lower_case='set'>

    @ElementCollection

        <#if field.props.type?has_content && field.props.type?lower_case='decimal'>
            <#assign setFieldType = "BigDecimal">
        <#elseif field.props.type?has_content && field.props.type?lower_case='integer'>
            <#assign setFieldType = "Long">
        <#elseif field.props.type?has_content && field.props.type?lower_case='string'>
            <#assign setFieldType = "String">
        <#else>
            <#assign setFieldType = field.props.type>
        </#if>

    private Set<${setFieldType}> ${field.name} = new HashSet<>();

    <#else>

        <#if field.props.nullable?has_content && field.props.nullable=false>
        @NotNull
        </#if>
    @Column(name =
        <#if field.name?has_content>
        "`${field.name}`"
        <#else>
        "`${field.name}`"
        </#if>
        <#if field.props.nullable?has_content>
        , nullable = ${field.props.nullable?c}
        </#if>
        <#if field.props.length?has_content>
        , length = ${field.props.length}
        </#if>
    )

        <#if field.props.type?has_content && field.props.type?lower_case='date'>
        @JsonSerialize(using = JsonDateSerializer.class)
        @JsonDeserialize(using = JsonDateDeserializer.class)
        @Type(type="com.eknv.turbo.domain.util.LocalDateUserType")
            <#assign fieldType = "LocalDate">
        <#elseif field.props.type?has_content && field.props.type?lower_case='datetime'>
        @JsonSerialize(using = JsonDateTimeSerializer.class)
        @JsonDeserialize(using = JsonDateTimeDeserializer.class)
        @Type(type="com.eknv.turbo.domain.util.LocalDateTimeUserType")
            <#assign fieldType = "LocalDateTime">
        <#elseif field.props.type?has_content && field.props.type?lower_case='time'>
        @JsonSerialize(using = JsonTimeSerializer.class)
        @JsonDeserialize(using = JsonTimeDeserializer.class)
        @Type(type="com.eknv.turbo.domain.util.LocalTimeUserType")
            <#assign fieldType = "LocalTime">
        <#elseif field.props.type?has_content && field.props.type?lower_case='decimal'>
            <#assign fieldType = "BigDecimal">
        <#elseif field.props.type?has_content && field.props.type?lower_case='integer'>
            <#assign fieldType = "Long">
        <#elseif field.props.type?has_content && field.props.type?lower_case='string'>
            <#assign fieldType = "String">
        <#elseif field.props.type?has_content && field.props.type?lower_case='select'>
            <#assign fieldType = "String">
        <#else>
            <#assign fieldType = field.props.type>
        </#if>

    <#--For the boolean type, set the default value to false-->
        <#if field.props.type?has_content && field.props.type?lower_case='boolean'>
        @Type(type = "com.eknv.turbo.domain.util.TurboBooleanType")
        </#if>
    private ${fieldType} ${field.name};

    </#if>


<#--Getters / Setters-->
    <#if field.props.rel_type?has_content && field.props.rel_type?lower_case='onetomany' >

        <#if field.props.rel_mapKey?has_content>
        public Map
        <Object, ${field.props.type}> get${field.name?cap_first}() {
        return ${field.name};
        }
        public void set${field.name?cap_first}(Map
        <Object, ${field.props.type}> ${field.name}) {
        this.${field.name} = ${field.name};
        }
        <#else>
            <#if field.props.rel_orderBy?has_content>
            public List<${field.props.type}> get${field.name?cap_first}() {
            return ${field.name};
            }
            public void set${field.name?cap_first}(List<${field.props.type}> ${field.name}) {
            this.${field.name} = ${field.name};
            }
            <#else>
            public Set<${field.props.type}> get${field.name?cap_first}() {
            return ${field.name};
            }
            public void set${field.name?cap_first}(Set<${field.props.type}> ${field.name}) {
            this.${field.name} = ${field.name};
            }
            </#if>
        </#if>

    <#elseif field.props.rel_type?has_content && field.props.rel_type?lower_case='set' >

        <#if field.props.type?has_content && field.props.type?lower_case='decimal'>
            <#assign setFieldType = "BigDecimal">
        <#elseif field.props.type?has_content && field.props.type?lower_case='integer'>
            <#assign setFieldType = "Long">
        <#elseif field.props.type?has_content && field.props.type?lower_case='string'>
            <#assign setFieldType = "String">
        <#else>
            <#assign setFieldType = field.props.type>
        </#if>

    public Set<${setFieldType}> get${field.name?cap_first}() {
    return ${field.name};
    }
    public void set${field.name?cap_first}(Set<${setFieldType}> ${field.name}) {
    this.${field.name} = ${field.name};
    }

    <#elseif field.props.rel_type?has_content && field.props.rel_type?lower_case='manytomany'>
    public Set<${field.props.type}> get${field.name?cap_first}() {
    return ${field.name};
    }
    public void set${field.name?cap_first}(Set<${field.props.type}> ${field.name}) {
    this.${field.name} = ${field.name};
    }


    <#elseif (field.props.type?has_content && field.props.type?lower_case='createdby')>
    public String getCreatedBy() {
    return createdBy;
    }

    public void setCreatedBy(String createdBy) {
    this.createdBy = createdBy;
    }

    <#elseif (field.props.type?has_content && field.props.type?lower_case='createddate')>
    public LocalDateTime getCreatedDate() {
    return createdDate;
    }
    public void setCreatedDate(LocalDateTime createdDate) {
    this.createdDate = createdDate;
    }

    <#elseif (field.props.type?has_content && field.props.type?lower_case='lastmodifiedby')>
    public String getLastModifiedBy() {
    return lastModifiedBy;
    }
    public void setLastModifiedBy(String lastModifiedBy) {
    this.lastModifiedBy = lastModifiedBy;
    }

    <#elseif (field.props.type?has_content && field.props.type?lower_case='lastmodifieddate')>
    public LocalDateTime getLastModifiedDate() {
    return lastModifiedDate;
    }
    public void setLastModifiedDate(LocalDateTime lastModifiedDate) {
    this.lastModifiedDate = lastModifiedDate;
    }

    <#elseif (field.props.type?has_content && field.props.type?lower_case='id')>
    public Long get${idName?cap_first}() {
    return ${idName};
    }
    public void set${idName?cap_first}(Long ${idName}) {
    this.${idName} = ${idName};
    }

    <#else>

        <#if field.props.type?has_content && field.props.type?lower_case='date'>
            <#assign fieldType = "LocalDate">
        <#elseif field.props.type?has_content && field.props.type?lower_case='datetime'>
            <#assign fieldType = "LocalDateTime">
        <#elseif field.props.type?has_content && field.props.type?lower_case='time'>
            <#assign fieldType = "LocalTime">
        <#elseif field.props.type?has_content && field.props.type?lower_case='decimal'>
            <#assign fieldType = "BigDecimal">
        <#elseif field.props.type?has_content && field.props.type?lower_case='integer'>
            <#assign fieldType = "Long">
        <#elseif field.props.type?has_content && field.props.type?lower_case='select'>
            <#assign fieldType = "String">
        <#else>
            <#assign fieldType = field.props.type>
        </#if>

    public ${fieldType} get${field.name?cap_first}() {
    return ${field.name};
    }
    public void set${field.name?cap_first}(${fieldType} ${field.name}) {
    this.${field.name} = ${field.name};
    }

    </#if>

</#list>

<#if idGeneratorName?has_content>
public String getIdGeneratorName() {
return "${idGeneratorName}";
}
</#if>

<#if hasId=true>
@Override
public boolean equals(Object o) {
if (this == o) {
return true;
}
if (o == null || getClass() != o.getClass()) {
return false;
}
${model.name} xyz = (${model.name}) o;
if (!Objects.equals(${idName}, xyz.${idName})) return false;
return true;
}

@Override
public int hashCode() {
return Objects.hashCode(${idName});
}
</#if>



@Override
public String toString() {
return "${model.name}{"
<#list model.fields as field>
    <#if (field.props.type?has_content && field.props.type?lower_case="id")>
    + ", ${idName}: " + ${idName}

    <#elseif (field.props.type?has_content && field.props.type?lower_case="createdby")>
    + ", createdBy: " + createdBy

    <#elseif (field.props.type?has_content && field.props.type?lower_case="createddate")>
    + ", createdDate: " + createdDate

    <#elseif (field.props.type?has_content && field.props.type?lower_case="lastmodifiedby")>
    + ", lastModifiedBy: " + lastModifiedBy

    <#elseif (field.props.type?has_content && field.props.type?lower_case="lastmodifieddate")>
    + ", lastModifiedDate:" + lastModifiedDate

    <#elseif field.props.rel_type?has_content>

        <#if field.props.rel_type?lower_case='manytoone'>
        + ", ${field.name}: " + ${field.name}

        <#elseif field.props.rel_type?lower_case='onetoone'
        && field.props.rel_mappedBy?has_content>
        + ", ${field.name}: " + ${field.name}

        </#if>

    <#else>
    + ", ${field.name}: " + ${field.name}

    </#if>

</#list>
+ '}';
}

}

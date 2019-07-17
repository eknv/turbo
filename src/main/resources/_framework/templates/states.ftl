'use strict';

angular.module('turboApp')
.config(function ($stateProvider, $urlRouterProvider) {
$stateProvider

<#list states as state>

    <#if state.device=='all' || state.device==device>

        <#if device=='mobile'>
            <#assign templatePostFix = "-mobile">
        <#else>
            <#assign templatePostFix = "">
        </#if>

    .state('${getAction(state.url)}', {

        <#if state.parent??>
        parent: '${state.parent}',
        </#if>
        <#if state.abstract??>
        abstract: ${state.abstract},
        </#if>
        <#if state.url??>
        url: "/action/" + '${state.url}',
        </#if>
    views: {
        <#list state.views as view>
        "${view.name}": {
        controller: '${getAction(state.url)}' + 'Ctrl',
        templateUrl: 'resource?usecase=' + '${state.url}/${state.url}${templatePostFix}.html'
        }
            <#if view?has_next>
            ,
            </#if>
        </#list>
    },
    data: {
        <#if state.roles??>
        roles: [${state.roles}],
        </#if>
        <#if state.roles??>
        pageTitle: '${state.title}'
        <#else>
        pageTitle: ''
        </#if>
    },
    resolve: {
        <#if state.propertyFiles??>
        translatePartialLoader: ['$translate', '$translatePartialLoader', function ($translate, $translatePartialLoader) {
            <#list state.propertyFiles as propertyFile>
            $translatePartialLoader.addPart('${propertyFile}');
            </#list>
        return $translate.refresh();
        }],
        </#if>
    loadMyCtrl: ['$ocLazyLoad', function ($ocLazyLoad) {
    return $ocLazyLoad.load('resource?usecase=' + '${state.url}/${state.url}.js');
    }]

        <#if state.directives??>
            <#list state.directives as directive>
            ,
            load${directive?replace("-", "_")?replace("/", "_")?replace(".directive", "")?replace("this:", "")}_Directive: ['$ocLazyLoad', function ($ocLazyLoad) {
            <#--if the directive name begins with /, then it is an absolute path otherwise it is in the same folder as the action-->
                <#if  directive?starts_with("this:")>
                return $ocLazyLoad.load('resource?usecase=' + '${state.url?replace("_", "/")}/${directive?replace("this:", "")}.js');
                <#else>
                return $ocLazyLoad.load('resource?directive=' + '${directive}.js');
                </#if>
            }]
            </#list>
        </#if>

        <#if state.resolvers??>
            <#list state.resolvers as resolver>
            ${getResolver(resolver, '_app/_bl/usecases/' + '${state.url}', 'resolve.js')}
            </#list>
        </#if>

    }
    })

    </#if>
</#list>
;

<#if release>
    <#list homes as home>
        <#if home.device==device>
        $urlRouterProvider.otherwise('${home.state}');
        </#if>
    </#list>
<#else>
$urlRouterProvider.otherwise('${maintenance}');
</#if>


});

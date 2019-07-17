
var execute = function (reload) {
    var entitiesByName = $$.globalCache.entitiesByName;
    if (G.isNullEmpty(entitiesByName) || entitiesByName._initialized != true || reload) {
        $$.globalCache.entitiesByName = {};
        var content = JSON.parse(designData)
        console.log('content: ', content)
        content.models.forEach(function (entity) {
            $$.globalCache.entitiesByName[entity.name.toLowerCase()] = entity;
        })
        $$.globalCache.entitiesByName._initialized = true;
        this.resolve($$.globalCache.entitiesByName);
    } else {
        this.resolve($$.globalCache.entitiesByName);
    }
}

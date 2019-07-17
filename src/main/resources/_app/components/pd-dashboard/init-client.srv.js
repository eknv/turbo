
var execute = function () {
    var entityDesignerData = $$.execute("entity-designer-load-data");
    var designData = JSON.parse(entityDesignerData.designData);
    var result = {
        version: entityDesignerData.version,
        links: designData.leftMenuTreeGridData,
        entitiesByName: $$.globalCache.entitiesByName,
        scriptPaths: clientScriptPaths,
        MAX_LOW: C.TurboIdGenerator.getMaxLow()
    }

    this.resolve(result);
}


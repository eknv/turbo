$$ = {

    /**
     * <p>this cache contains the following variables
     * <ul>
     * <li>scriptPaths
     * <li>entitiesByName
     * <li>links
     * </ul>
     * <p>
     */
    globalCache: {
        _initialized: false
    },
    globalCachePromise: null,

    initGlobalCache: function () {
        var self = this;
        if (this.globalCachePromise != null) {
            return this.globalCachePromise;
        } else {

            var deferred = Q.defer();
            this.globalCachePromise = deferred.promise;

            if (self.globalCache._initialized == true) {
                deferred.resolve(self.globalCache);
            } else if (self.globalCache._initialized != 'PENDING') {
                self.globalCache._initialized = 'PENDING';
                $.ajax({
                    url: "http://localhost:5050/api/action",
                    method: 'POST',
                    contentType: 'application/json',
                    accept: 'application/json',
                    data: JSON.stringify({
                        actionName: 'init-client',
                        params: []
                    }),
                    success: function (data) {
                        DB.init(data.value.version, data.value.MAX_LOW);
                        self.globalCache.scriptPaths = data.value.scriptPaths;
                        self.globalCache.entitiesByName = data.value.entitiesByName;
                        self.globalCache.links = data.value.links;
                        self.globalCache._initialized = true;
                        self.initSchemas();
                        deferred.resolve(self.globalCache);
                    },
                    error: function (error) {
                        deferred.reject(error);
                    }
                });
            }

            return this.globalCachePromise;
        }
    },


    entityByName: function (entityName) {
        assert.isTrue(this.globalCache._initialized == true, 'this.globalCache._initialized == true')
        return this.globalCache.entitiesByName[entityName];
    },


    initSchemas: function () {
        var self = this;
        _.forOwn(this.globalCache.entitiesByName, function (model, key) {
            //todo/kn.. support for the views should be added yet
            if (!G.isNullEmpty(model.viewModel)) {
                return;
            }
            var modelName = model.name;
            var columns = [];
            G.toArray(model.fields).forEach(function (field) {
                var fieldName = field.name;
                var fieldType = DB.convertToClnType(field.props.type);
                var mandatory = !G.isNullEmpty(field.props.nullable) && G.isFalse(field.props.nullable);
                var primary = field.props.type == 'ID';
                columns.push({name: fieldName, type: fieldType, mandatory: mandatory, primary: primary})
            });
            if (!G.isNullEmpty(modelName) && !G.isNullEmpty(columns) &&
                ($stl(modelName) == 'student' || $stl(modelName) == 'address')) {
                DB.defineSchema({entityName: modelName, columns: columns});
            }
        });
    },


    executeModel: function (actionName, params) {
        var self = this;
        var deferred = Q.defer();

        var interval = setInterval(function () {
            if (!$$.globalCache._initialized) {
                return;
            }
            clearInterval(interval);

            var modelName = params[0];
            assert.isTrue(!G.isNullEmpty(modelName), "model-name cannot be null");
            var entities = $$.globalCache.entitiesByName[$stl(modelName)];
            var isClientSide = !G.isNullEmpty(entities) && G.isTrue(entities.clientSide);
            self.execute(actionName, params, !isClientSide)
                .then(function (result) {
                    deferred.resolve(result);
                })
                .catch(function (error) {
                    deferred.reject(error);
                });
        }, 500);

        return deferred.promise;
    },


    execute: function (actionName, params, forceServerSide) {
        var self = this;

        var deferred = Q.defer();
        var resolve = function (result) {
            deferred.resolve(result);
        }
        var reject = function (error) {
            deferred.reject(error);
        }

        var interval = setInterval(function () {
            if (!$$.globalCache._initialized) {
                return;
            }
            clearInterval(interval);

            var actionPath = $$.globalCache.scriptPaths[actionName];

            /**
             * execute the script on the client side
             */
            if (actionPath != null && !G.isTrue(forceServerSide)) {
                return $.ajax({
                    cache: true,
                    url: actionPath,
                    dataType: 'script',
                    success: function (data) {
                        console.log("action '" + actionName + "' in the path '" + actionPath + "' has been loaded successfully!");
                        eval(data);
                        var promiseContext = {
                            resolve: resolve,
                            reject: reject
                        };
                        var exe = execute.bind(promiseContext);
                        exe.apply(null, params);
                    },
                    error: function (error) {
                        reject(error);
                    }
                });
            }
            else {
                /**
                 * execute the script on the server side
                 */
                return $.ajax({
                    url: "http://localhost:5050/api/action",
                    method: 'POST',
                    contentType: 'application/json',
                    accept: 'application/json',
                    data: JSON.stringify({
                        actionName: actionName,
                        params: params
                    }),
                    success: function (data) {
                        resolve(data.value);
                    },
                    error: function (error) {
                        reject(error.value);
                    }
                });
            }

        }, 500);

        return deferred.promise;
    },


    /**
     * @param url url to get
     * @param dataType xml, html, script, json, jsonp, text
     * consult the following link for more details: http://api.jquery.com/jquery.ajax/
     */
    pAjax: function (method, url, dataType) {
        var deferred = Q.defer();
        $.ajax({
            method: method,
            url: url,
            dataType: dataType,
            success: function (data, textStatus, request) {
                deferred.resolve(data, textStatus, request);
            },
            error: function (error) {
                deferred.reject(error);
            }
        });
        return deferred.promise;
    }

}

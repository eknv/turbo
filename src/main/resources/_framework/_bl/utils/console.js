var console =
    {
        valueAsString: function (value) {
            var self = this;
            var returnValue = '';
            if (G.isNullEmpty(value)) {
                returnValue += "null";
            } else if (G.isArray(value)) {
                returnValue += "[";
                value.forEach(function (item) {
                    returnValue += self.valueAsString(item) + " ";
                });
                returnValue += "]";
            } else if ($$ != null && $$.isJSObject != null && !$$.isJSObject(value)) {
                return value;
            } else if (G.isObject(value)) {
                try {
                    _.forOwn(value, function (value, key) {
                        returnValue += key + " -> " + self.valueAsString(value) + " ";
                    });
                } catch (e) {
                    returnValue += 'entity';
                }
            } else {
                returnValue += value + " ";
            }
            return returnValue;
        },


        log: function () {
            var returnValue = "";
            for (var i = 0; i < arguments.length; i++) {
                returnValue += this.valueAsString(arguments[i]);
            }
            print(returnValue);
        }

    };

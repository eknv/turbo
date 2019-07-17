/**
 * Object containing general utility methods
 */
var G = {

    test: function () {
        console.log(_.template('hello <%= user %>!')({'user': 'fred'}))
    },

    /**
     * nashorn utility method
     * this is a shortcut method to the int method
     * see also int method
     * @param number
     * @returns an object of type long
     */
    i: function (number) {
        return this.int(number)
    },

    /**
     * nashorn utility method
     * if the given object is not long or integer, parse the toString of the argument to long
     * @param number to be converted to long
     * @returns an object of type long
     */
    int: function (number) {
        var returnValue = null;
        if (C.GeneralUtil.isNull(number)) {
            return null;
        }
        if (number instanceof C.Long) {
            returnValue = number;
        }
        if (number instanceof C.Integer) {
            returnValue = number.longValue();
        } else {
            try {
                returnValue = C.Long.valueOf("" + number);
            } catch (e) { }
        }
        return returnValue;
    },

    /**
     * nashorn utility method
     * this is a shortcut method to dec method
     * @param number
     * @returns object of type big-decimal
     */
    d: function (number) {
        return this.dec(number)
    },

    /**
     * nashorn utility method
     * converts the given number to big-decimal
     * if the given object is not a integer, long or double, it tries to parse the toString of the method
     * @param number of type integer, long or double
     * @returns object of type big-decimal
     */
    dec: function (number) {
        if (C.GeneralUtil.isNull(number)) {
            return null;
        }
        if (number instanceof C.Integer) {
            return C.BigDecimal.valueOf(number.longValue());
        } else if (number instanceof C.Long) {
            return C.BigDecimal.valueOf(number);
        } else if (number instanceof C.Double) {
            return C.BigDecimal.valueOf(number);
        } else {
            try {
                return C.BigDecimal.valueOf("" + number);
            } catch (e) { }
        }
        return null;
    },

    /**
     * check whether the given value is null or empty
     * - is null or undefined
     * - it is not an java object (Server side)
     * - in case of an array is empty
     * - in case of an object, it does not have any properties
     * - in case of an string it is empty
     * @param value
     * @returns {boolean}
     */
    isNullEmpty: function (value) {
        if (value == null || value == undefined) {
            return true;
        } else if ($$ != null && $$.isNullEmpty != null && $$.isNullEmpty(value)) {
            return true;
        } else if ($$ != null && $$.isJSObject != null && !$$.isJSObject(value)) {
            return false;
        } else if (typeof value === 'string' && value.trim() == '') {
            return true;
        } else if (this.isArray(value) && value.length == 0) {
            return true;
        }
        else if (this.isMapObject(value) && Object.keys(value).length === 0) {
            return true;
        }
        return false;
    },

    isMapObject: function (obj) {
        return !this.isDateObject(obj) && !this.isFunctionObject(obj) && typeof obj === 'object';
    },

    isDateObject: function (date) {
        return date && typeof date.getMonth === 'function';
    },


    isFunctionObject: function (fnc) {
        return fnc && typeof fnc === "function";
    },


    /**
     * check whether the given object is an array
     * @param value
     * @returns {boolean|*}
     */
    isArray: function (value) {
        return value.constructor === Array
            || (value.class != null && value.class.isArray())
            || ($$.isArray != null && $$.isArray(value))
            || ($$.isCollection != null && $$.isCollection(value))
    },

    /**
     * check whether the given value is an object
     * @param value
     * @returns {boolean}
     */
    isObject: function (value) {
        return typeof value === 'object';
    },

    /**
     * create an array out of the values of the given object
     * @param obj to create an array from
     * @returns {*}
     */
    toArray: function (obj) {
        if (G.isNullEmpty(obj)) {
            return [];
        }
        if (this.isArray(obj)) {
            return obj;
        }
        return _.values(obj);
    },

    /**
     * if the object is array return it otherwise push it to an array and return that array
     * @param object to return in an array
     * @returns {*}
     */
    inArray: function (object) {
        if (object == null) {
            return null;
        } else if (this.isArray(object)) {
            return object;
        } else {
            var newArray = [];
            newArray.push(object);
            return newArray;
        }
    },


    isTrue: function (object) {
        return !G.isNullEmpty(object) && (object == true || (typeof value === 'string' && $stl(object) == 'true'));
    },

    isFalse: function (object) {
        return !G.isNullEmpty(object) && (object == false || (typeof value === 'string' && $stl(object) == 'false'));
    },

    props: function (object) {
        var properties = [];
        for (var property in object) {
            if (object.hasOwnProperty(property)) {
                properties.push(property);
            }
        }
        return properties;
    },

    equalDatetime: function (date1, date2) {
        if (G.isNullEmpty(date1) && G.isNullEmpty(date2)) {
            return true;
        } else if (G.isNullEmpty(date1) || G.isNullEmpty(date2)) {
            return false;
        } else {
            var moment1 = moment(date1);
            var moment2 = moment(date2);
            return moment1.seconds() == moment2.seconds()
            && moment1.minutes() == moment2.minutes()
            && moment1.hours() == moment2.hours()
            && moment1.date() == moment2.date()
            && moment1.month() == moment2.month()
            && moment1.year() == moment2.year();
        }
    },

    /**
     * check if an object has a property in JS
     * @returns {boolean}
     */
    has: function (object, property) {
        return object ? hasOwnProperty.call(object, property) : false;
    }

}


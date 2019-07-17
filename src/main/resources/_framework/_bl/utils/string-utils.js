
$st = function (text) {
    return text.trim();
}

$stu = function (text) {
    return text.trim().toUpperCase();
}

$stl = function (text) {
    return text.trim().toLowerCase();
}

var S = {
    replaceAll: function (str, find, replace) {
        return str.replace(new RegExp(S.escapeRegExp(find), 'g'), replace);
    },

    escapeRegExp : function (str) {
        return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    },

    format : function (string, replacements) {
        string = string.replace(/%\w+%/g, function (all) {
            return replacements[all] || all;
        });
        return string;
    },

    //todo/kn needs testing
    uncapitalize: function (text) {
        if (text == null || typeof text !== "string") {
            return text;
        }
        var returnText = '';
        for (var i = 0; i < text.length; i++) {
            var currentChar = text.charAt(i);
            if (currentChar == currentChar.toUpperCase()) {
                returnText += currentChar.toLowerCase();
            } else {
                returnText += text.substr(i);
                break;
            }
        }
        return returnText;
    }

}



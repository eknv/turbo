
var $random1000000 = function () {
    return $randomNumber(0, 1000000);
}

var $randomNumber= function (from, to) {
    return Math.floor(Math.random() * to) + from;
}


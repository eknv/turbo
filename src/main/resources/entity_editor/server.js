var express = require('express');
var fs = require('fs');
var url = require('url');
var bodyParser = require('body-parser');
var beautify = require('js-beautify').js_beautify;

var app = express();
// for using the http post
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
// for serving static content
app.use(express.static('.'));

var filePath = '../config/models_generated.json';

app.post('/data', function (request, response) {
    var content = beautify(request.body.content);
    fs.writeFile(filePath, content, function () {
        response.send('Hello World!');
    });
});

app.get('/data', function (request, response) {
    fs.readFile(filePath, 'utf8', function (err, data) {
        if (err) {
            console.log(err);
            response.send(err);
        }
        response.send(data);
    });
});

app.listen(8181)

console.log('Server running on port 8181');

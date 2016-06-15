var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');
var goodGuy = require('good-guy-http')({maxRetries: 3});
var jp = require('jsonpath');
var esiMiddleware = require('nodesi').middleware;

var app = express();


function logRequestTime(req, res, next) {
    eventStartTime = Date.now();

    res.on('finish', function () {
        var correlationId = req.headers['x-request-id'] || Math.random();
        console.log('Request processing time [ms]=', Date.now() - eventStartTime, 'request_id=', correlationId);
    });
    next();
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(logRequestTime);
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(esiMiddleware({       onError: function(src, error) {
            return '<!-- GET ' + src + 'resulted in ' + error + '-->';
        }}));



app.get('/book/:isbn', function(req, res, next) {

    var correlationId = req.headers['x-request-id'] || Math.random();

    req.esiOptions = {
        headers: {
            "Accept": "text/html",
            'X-Request-ID': correlationId
        }
    };

    goodGuy('https://book-catalog-proxy-4.herokuapp.com/book?isbn=' + req.params.isbn).then(function(response) {

    var body = JSON.parse(response.body);
    var title = jp.value(body, '$..title');
    var cover = jp.value(body, '$..thumbnail');

    res.render('book', {title: title, cover: cover, isbn: req.params.isbn, requestid: correlationId, partials: {
      layout: 'layout_file'
    }});
  }).catch(next);
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
var express = require("express"),
    config  = require("./config.js"),
    utils   = require("./utils.js"),
    async = require("async"),
    path = require('path'),
	config= require("./config.js"),
	socket = require("./socket.js");

var app       = express();

var models = null;

app.configure("development", function () {
    app.set("port", config.devPort);
    app.use(express.logger());
});

app.configure("production", function () {
    app.set("port", config.prodPort);
});

app.configure(function () {
    app.use(express.cookieParser());
    app.use(express.bodyParser({limit: '50mb'}));
    app.use(express.json({limit: '50mb'}));
    app.use(express.urlencoded({limit: '50mb'}));
    app.use(express.methodOverride());
//    app.use(express.session({ secret: secretKey, store: store, cookie: { secure: false, maxAge: 86400000 }, maxAge: 360*5}));
    app.use(app.router);
});

var startApp = function (err) {
    if (err) {
        console.log(err);
    } else {
		//socket.startSocket({app: app, models: models});
        //app.listen(app.get("port"), function () {
		//	console.log("Express App Started on Port: " + app.get("port"));
			//socket.startSocket({app: app, models: models});
        //});
    }
}

async.parallel([
    function (callback) {
        utils.loadMiddlewares({}, callback);
    },
    function (callback) {
        utils.loadModels({ dbConnection : config.dbConnection }, callback);
    },
    function (callback) {
        utils.loadControllers({}, callback);
    },
], function (err, results) {
   socket.startSocket({app: app, models: results[1]});
});
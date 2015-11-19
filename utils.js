var fs = require('fs'),
    walk = require('walk'),
    path = require('path'),
	hat = require('hat'),
    async = require('async'),
	express = require('express');

module.exports.loadMiddlewares = function (opts, cb) {
    var options = opts || {},
        dir = path.join(__dirname, "app", "middlewares"),
        walker = walk.walk(dir, options),
        middlewares = [];
    
    walker.on('file', function (root, fileStats, next) {
        var middlewareFunc = require(path.join(root, fileStats.name));
        var middleware = middlewareFunc(opts);
        var type = root.split('/').pop();
        
        middlewares.push({ middleware : middleware, type : type });
        next();
    });
    
    walker.on('end', function () {
        if (cb) {
            cb(null, middlewares);
        }
    });
}

module.exports.loadModels = function (opts, cb) {
    var options = opts || {},
         dir = path.join(__dirname, "app", "models"),
         walker = walk.walk(dir, options),
         models = {},
         dbConnection = options.dbConnection;
    
    walker.on("file", function (root, fileStats, next) {
        var schema = require(path.join(root, fileStats.name)),
            modelName = fileStats.name.replace(".js", ""),
            schema = schema(opts);
            
        if (dbConnection) { 
            var model = dbConnection.model(modelName, schema);
            models[modelName] = model;
        }
        
        next();
    });
    
    walker.on("end", function () {
        if (cb) {
            cb(null, models);
        }
    });   
}

module.exports.loadControllers = function (opts, cb) {
   var options  = opts || {},
       dir      = path.join(__dirname, "app", "controllers"),
       walker   = walk.walk(dir, options),
       controllers = [];
   
   walker.on("file", function (root, fileStats, next) {
       var controllerFunc = require(path.join(root, fileStats.name));
       var type = root.split('/').pop();
       
       controllers.push({ func : controllerFunc, type : type });
       next();
   });
   
   walker.on("end", function () {
      if (cb) {
          cb(null, controllers);
      } 
   });
}

module.exports.sync = function (app, results, cb) {
    async.each(results[2], function (item, callback) {
        var controller = item.func({ models : results[1] });
        var accessType = item.type;
        var keys = Object.keys(controller);
        
        for (var i = 0; i < keys.length; i++) {
            var name = keys[i],
                params = name.split("#"),
                type = params[0],
                method = params[1];
          
            if (accessType == "controllers") {
                if (type == "get") {
                    app.get("/api/" + method, express.bodyParser({limit: '1000mb'}), controller[name]);
                } else if (type == "post") {
                    app.post("/api/" + method, express.bodyParser({limit: '1000mb'}), controller[name]);
                }
            } else if (accessType == "user") {
                if (type == "get") {
                    app.get("/api/" + method, express.bodyParser({limit: '1000mb'}), function (req, res, next) {
						return next();
                    }, controller[name]);
                } else if (type == "post") {
                    app.post("/api/" + method, express.bodyParser({limit: '1000mb'}), function (req, res, next) {
						return next();
                    }, controller[name]);
                }
            }
			//FOR TEST PURPOSE: WILL DELEETE
			else {
                if (type == "get") {
                    app.get("/api/" + method, express.bodyParser({limit: '1000mb'}), controller[name]);
                } else if (type == "post") {
                    app.post("/api/" + method, express.bodyParser({limit: '1000mb'}), controller[name]);
                }
			}
        }
        
        callback(null);
    }, function (err) {
        if (cb) {
            cb(err);
        }
    });
}
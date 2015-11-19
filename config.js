var mongoose = require("mongoose");

module.exports.devPort = process.env.PORT || 9010;
module.exports.prodPort = process.env.PORT || 80;

module.exports.dbConnection = mongoose.createConnection("mongodb://dennis:dennis@ds057244.mongolab.com:57244/heroku_svd3fv5h");
//module.exports.dbConnection = mongoose.createConnection("mongodb://localhost:27017/local");
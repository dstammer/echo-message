var mongoose = require("mongoose");

module.exports = function (opts) {
    var Schema = mongoose.Schema({
        social_id : {
            type: String,
            required: true
        },
		provider : {
			type: String,
			required: true
		},
        name : {
			type: String,
			required: true
		},
		photo_url : {
			type: String,
			required: true
		},
		friends : [{
            type: String,
        }],
		location :{
			type: String
		},
		echo_text :{
			type: String
		},
		device_token :{
			type: String
		},
    });
    
    return Schema;
}
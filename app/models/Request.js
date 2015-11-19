var mongoose = require("mongoose");

module.exports = function (opts) {
    var Schema = mongoose.Schema({
        from_id : {
            type: String,
            required: true
        },
		to_id : {
			type: String,
			required: true
		},
		provider : {
			type: String,
		},
		location :{
			type: String
		},
		request_text :{
			type: String
		},
		timestamp :{
			type: Number
		},
		type :{
			type: String
		}
    });
    
    return Schema;
}
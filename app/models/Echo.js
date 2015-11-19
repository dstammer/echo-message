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
		text :{
			type: String
		},
		is_picture :{
			type: String
		},
		is_received :{
			type: String
		},
		timestamp :{
			type: Number
		},
		from_color: {
			type: String
		},
		to_color: {
			type: String
		}
    });
    
    return Schema;
}
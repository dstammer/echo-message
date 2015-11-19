module.exports = function (opts) {
    var socialModel = opts.models.Social,
		requestModel = opts.models.Request,
		echoModel = opts.models.Echo,
		sockets = opts.sockets,
		async = require('async');
        
    return {
        "getStatus" : function (req) {
            var provider = req.provider,
				identifier = req.identifier,
				to_provider = req.to_provider,
				to_identifier = req.to_identifier;
                            
			var query = socialModel.findOne({$and : [{social_id: to_identifier}, {provider: to_provider}]});
            query.exec(function (err, social) {
                if (err) {
                    console.log(err);

					var to_socket = sockets[to_provider + "_" + to_identifier],
						my_socket = sockets[provider + "_" + identifier];
                    if(my_socket){
						try{
							my_socket.send(JSON.stringify({"response" : "return_status", "success" : false, "error": "Internal Server Error!"}));
						} catch(e){}
					}
                } else if (social) {
					var ret = {};

					ret.echo_status = social.echo_text != "";
					ret.response = "return_status";
					ret.success = true;

					requestModel.findOne({$or : [{$and : [{from_id: identifier}, {to_id: to_identifier}, {provider: to_provider}]}, {$and : [{from_id: to_identifier}, {to_id: identifier}, {provider: to_provider}]}]}).sort({timestamp: - 1}).limit(1).exec(function(err, echo_request){
						if(err){
							console.log(err);

							var to_socket = sockets[to_provider + "_" + to_identifier],
								my_socket = sockets[provider + "_" + identifier];

							if(my_socket){
								try{
									my_socket.send(JSON.stringify({"response" : "return_status", "success" : false, "error": "Internal Server Error!"}));
								} catch(e){}
							}
						} else if(echo_request){
							var to_socket = sockets[to_provider + "_" + to_identifier],
								my_socket = sockets[provider + "_" + identifier];

							if(my_socket){
								ret.connection_status = echo_request.type;
								ret.connection_from = echo_request.from_id;
								try{
									my_socket.send(JSON.stringify(ret));
								} catch(e){}
							}
						} else {
							var to_socket = sockets[to_provider + "_" + to_identifier],
								my_socket = sockets[provider + "_" + identifier];

							if(my_socket){
								ret.connection_status = "0";
								ret.connection_from = "";
								try{
									my_socket.send(JSON.stringify(ret));
								} catch(e){}
							}
						}
					});

                } else {
					var to_socket = sockets[to_provider + "_" + to_identifier],
						my_socket = sockets[provider + "_" + identifier];

					if(my_socket){
						try{
							my_socket.send(JSON.stringify({"response" : "return_status", "success" : false, "error": "User Not Found!"}));
						} catch(e){}
					}
                }
            });
        },
		"getPreviousMessages" : function (req) {
            var provider = req.provider,
				identifier = req.identifier,
				to_provider = req.to_provider,
				to_identifier = req.to_identifier,
				time = req.timestamp;

			if(time){
				time = time;
			} else {
				time = new Date().getTime();
			}
                            
			var query = echoModel.find({$and : [{$or : [{$and : [{to_id: to_identifier}, 
														  {from_id: identifier}, 
														  {provider: to_provider}]},
														{$and : [{from_id: to_identifier}, 
														  {to_id: identifier}, 
														  {provider: to_provider}]}
														]
												}, 
												{timestamp: {$lt: time}}]}).sort({timestamp: - 1}).limit(10);

            query.exec(function (err, echos) {
                if (err) {
					var to_socket = sockets[to_provider + "_" + to_identifier],
						my_socket = sockets[provider + "_" + identifier];

					if(my_socket){
						try{
							my_socket.send(JSON.stringify({"response" : "return_previous_messages", "success" : false, "error": "Internal Server Error!"}));
						} catch(e){}
					}
                } else if (echos) {
					var ret = {};

					ret.response = "return_previous_messages";
					ret.success = true;
					ret.messages = [];
					
					for(var i = 0; i < echos.length; i++){
						var msg = {};
						msg._id = echos[i]._id;
						msg.from_id = echos[i].from_id;
						msg.to_id = echos[i].to_id;
						msg.provider = echos[i].provider;
						msg.text = echos[i].text;
						msg.is_picture = echos[i].is_picture;
						msg.is_received = echos[i].is_received;
						msg.timestamp = echos[i].timestamp;
						try{
							msg.from_color = JSON.parse(echos[i].from_color);
						} catch(e){
							msg.from_color = '';
						}

						try{
							msg.to_color = JSON.parse(echos[i].to_color);
						} catch(e){
							msg.to_color = '';
						}

						ret.messages.push(msg);
					}

					var to_socket = sockets[to_provider + "_" + to_identifier],
						my_socket = sockets[provider + "_" + identifier];
					
					if(my_socket){
						try{
							my_socket.send(JSON.stringify(ret));
						} catch(e){}
					}
					
					async.each(echos, function (item, callback) {
						item.is_received = "YES";
						item.save();
					}, function(){});
                } else {
					var to_socket = sockets[to_provider + "_" + to_identifier],
						my_socket = sockets[provider + "_" + identifier];

					if(my_socket){
						try{
							my_socket.send(JSON.stringify({"response" : "return_previous_messages", "success" : false, "messages": []}));
						} catch(e){}
					}
                }
            });
        },
		"sendRequest" : function (req) {
            var provider = req.provider,
				identifier = req.identifier,
				to_provider = req.to_provider,
				to_identifier = req.to_identifier,
				lat = req.lat,
				lng = req.lng,
				type = req.type;

            var request = new requestModel();

			request.provider = provider;
			request.from_id = identifier;
			request.to_id = to_identifier;
			request.location = JSON.stringify({"lat":lat, "lng": lng});
			request.type = type;
			request.timestamp = new Date().getTime();

			request.save(function(err, nRequest){
				if(!nRequest){
					return;
				}
				
				var to_socket = sockets[to_provider + "_" + to_identifier],
					my_socket = sockets[provider + "_" + identifier];

				if(to_socket){
					try{
						to_socket.send(JSON.stringify({"response":"echo_request_received", "success": true, "provider": provider, "from_id": identifier, "type": type}));
					} catch(e){}
				}

				if(nRequest.type == "1"){
					var push = require('../notification.js');
					socialModel.findOne({$and : [{social_id: to_identifier}, {provider: to_provider}]}).exec(function(err, social){
						if(social){
							push.send(social.device_token, "You have received a new echo request from " + social.name, 1, {}, null);
						}
					});
				}
			});
        },
		"sendMessage" : function (req) {
            var provider = req.provider,
				identifier = req.identifier,
				to_provider = req.to_provider,
				to_identifier = req.to_identifier,
				text = req.text;
                         
            var message = new echoModel();

			message.provider = provider;
			message.from_id = identifier;
			message.to_id = to_identifier;
			message.text = text;
			message.timestamp = new Date().getTime();
			message.is_received = "NO";
			message.is_picture = "NO";
			message.from_color = "";
			message.to_color = "";

			message.save(function(err, nMessage){
				if(!nMessage){
					return;
				}

				var to_socket = sockets[to_provider + "_" + to_identifier],
					my_socket = sockets[provider + "_" + identifier];

				var msg = {};
				msg._id = nMessage._id;
				msg.from_id = nMessage.from_id;
				msg.to_id = nMessage.to_id;
				msg.provider = nMessage.provider;
				msg.text = nMessage.text;
				msg.is_picture = nMessage.is_picture;
				msg.is_received = nMessage.is_received;
				msg.timestamp = nMessage.timestamp;
				try{
					msg.from_color = JSON.parse(nMessage.from_color);
				} catch(e){
					msg.from_color = '';
				}

				try{
					msg.to_color = JSON.parse(nMessage.to_color);
				} catch(e){
					msg.to_color = '';
				}

				if(to_socket){
					try{
						to_socket.send(JSON.stringify({"response":"echo_received", "success": true, "message": msg}));
					} catch(e){}
				}

				if(my_socket){
					try{
						my_socket.send(JSON.stringify({"response":"echo_received", "success": true, "message": msg}));
					} catch(e){}
				}

				var push = require('../notification.js');
				socialModel.findOne({$and : [{social_id: to_identifier}, {provider: to_provider}]}).exec(function(err, social){
					if(social){
						push.send(social.device_token, "You have received a new echo from " + social.name + ' "' + message.text + '"', 1, {}, null);
					}
				});
			});
        },
		"sendPicture" : function (req) {
            var provider = req.provider,
				identifier = req.identifier,
				to_provider = req.to_provider,
				to_identifier = req.to_identifier,
				text = req.text;

            var message = new echoModel();

			message.provider = provider;
			message.from_id = identifier;
			message.to_id = to_identifier;
			message.text = text;
			message.timestamp = new Date().getTime();
			message.is_received = "NO";
			message.is_picture = "YES";
			message.from_color = "";
			message.to_color = "";

			message.save(function(err, nMessage){
				if(!nMessage){
					return;
				}

				var to_socket = sockets[to_provider + "_" + to_identifier],
					my_socket = sockets[provider + "_" + identifier];
				if(to_socket){
					try{
						to_socket.send(JSON.stringify({"response":"echo_received", "success": true, "message": nMessage}));
					}catch(e){}
				}

				if(my_socket){
					try{
						my_socket.send(JSON.stringify({"response":"echo_received", "success": true, "message": nMessage}));
					} catch(e){}
				}

				var push = require('../notification.js');
				socialModel.findOne({$and : [{social_id: to_identifier}, {provider: to_provider}]}).exec(function(err, social){
					if(social){
						push.send(social.device_token, "You have received a new image from " + social.name, 1, {}, null);
					}
				});
			});
        },
		"messageViewed" : function (req) {
            var provider = req.provider,
				identifier = req.identifier,
				to_provider = req.to_provider,
				to_identifier = req.to_identifier,
				id = req.id;

            echoModel.findOne({_id: id}).exec(function(err, message){
				if(message){
					message.is_received = "YES";

					message.save(function(err, nMessage){
						if(nMessage){
							var to_socket = sockets[to_provider + "_" + to_identifier],
								my_socket = sockets[provider + "_" + identifier];

							if(to_socket){
								try{
									to_socket.send(JSON.stringify({"response":"echo_viewed", "success": true, "id": id}));
								} catch(e){}
							}
						}
					});
				}
			});
        },
		"changeMessageColor" : function (req) {
            var provider = req.provider,
				identifier = req.identifier,
				id = req.id,
				color = req.color;

            echoModel.findOne({_id: id}).exec(function(err, message){
				if(message){
					if(message.to_id == identifier){
						message.to_color = JSON.stringify(color);
					} else {
						message.from_color = JSON.stringify(color);
					}

					message.save(function(err, nMessage){
						if(nMessage){
							var my_socket = sockets[provider + "_" + identifier];
							console.log(nMessage);
							if(my_socket){
								try{
									my_socket.send(JSON.stringify({"response":"message_color_changed", "success": true, "id": id}));
								} catch(e){}
							}
						}
					});
				}
			});
        },
    }
}
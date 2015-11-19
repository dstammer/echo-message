module.exports.startSocket = function(opts){
	// Socket Part
	var http = require("http"),
		port = process.env.PORT || 5000,
		server = http.createServer(opts.app);
	
	server.listen(port);
	var WebSocketServer = require("ws").Server
	var wss = new WebSocketServer({server: server});
	var sockets = {};

	console.log("Web socket server started on port: " + port);

	wss.on("connection", function(ws){
		console.log("Socket connected");
		var user_id = "", msg;
		ws.on("message", function incoming(msg){	
			console.log('--msg--');
			console.log(msg);
			console.log('--msg--');
			try{
				var req = JSON.parse(msg),
					provider = req["provider"],
					identifier = req["identifier"],
					request = req["request"];
			} catch ( e ) {
				console.log(e);
				var req = {},
					provider, identifier, request;
			}

			msg = null;

			if(!request || !provider || !identifier){
				return;
			}
			
			user_id = provider + "_" + identifier;
			sockets[user_id] = ws;

			switch(request){
				case "get_status":
					require("./handlers/socket.js")({models: opts.models, sockets: sockets}).getStatus(req);
					break;
				case "get_previous_messages":
					require("./handlers/socket.js")({models: opts.models, sockets: sockets}).getPreviousMessages(req);
					break;
				case "send_message":
					require("./handlers/socket.js")({models: opts.models, sockets: sockets}).sendMessage(req);
					break;
				case "send_picture":
					require("./handlers/socket.js")({models: opts.models, sockets: sockets}).sendPicture(req);
					break;
				case "send_request":
					console.log('--send echo request--');
					require("./handlers/socket.js")({models: opts.models, sockets: sockets}).sendRequest(req);
					break;
				case "message_viewed":
					require("./handlers/socket.js")({models: opts.models, sockets: sockets}).messageViewed(req);
					break;
				case "change_message_color":
					require("./handlers/socket.js")({models: opts.models, sockets: sockets}).changeMessageColor(req);
					break;
			}
		});

		ws.on("close", function(){
			console.log("Socket disconnected:" + user_id);
			if(user_id != ""){
				sockets["user_id"] = null;
			}
		});

		ws.on("error", function(err){
			console.log("Socket disconnected:" + user_id);
			if(user_id != ""){
				sockets["user_id"] = null;
			}
		});
	});
}
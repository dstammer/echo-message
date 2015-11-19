var apn = require('apn');
function yes(code, notification){
	console.log(code);
	console.log(notification);
}

module.exports = {
	send : function(token, message, badge, payload, callback){
		
		var options = {
//			cert : "./push/devcert.pem",
//			key : "./push/devkey.pem",
			cert : "./push/prodcert.pem",
			key : "./push/prodkey.pem",
			passphrase : "password",
//			production : false,
			production: true,
			errorCallback: yes,
			enhanced: true,
//			"batchFeedback": true,
//			"interval": 300
		};
//
//		var feedback = new apn.Feedback(options);
//		feedback.on("feedback", function(devices) {
//			devices.forEach(function(item) {
//				console.log(item.device);
//			});
//		});

		if(!token) return;

		var apnConnection = new apn.Connection(options);

		var myDevice = new apn.Device(token);

		var note = new apn.Notification();

		note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
		note.badge = 1;
		note.sound = "default";
		note.alert = message;//"\uD83D\uDCE7 \u2709 You have a new message";
		note.payload = payload;
		note.device = myDevice;

		console.log('push message - ' + message);
		console.log(payload);

		apnConnection.pushNotification(note, myDevice);
		console.log('apns token - ' + token);
		
/*
		var apnagent = require('apnagent');
		var agent = apnagent.Agent();

		var join = require('path').join;
		var pfx = join(__dirname, './push/dev.p12');
		console.log(pfx);

		agent.set('pfx file', pfx);
		//agent.enable('sandbox');

		agent.connect(function (err) {
			console.log(err);
			console.log("push connect error");
		});

		agent.createMessage().device(token).alert(message).send();
		console.log(token);
		console.log(message);*/
	}
};
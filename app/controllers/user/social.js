var async = require('async');

module.exports = function (opts) {
    var socialModel = opts.models.Social,
		requestModel = opts.models.Request,
		echoModel = opts.models.Echo;
        
    return {
        "post#social/create" : function (req, res) {
            var social_id = req.body.social_id,
				provider = req.body.provider,
				friends = req.body.friends,
				name = req.body.name,
				photo = req.body.photo,
				location = "",
				echo_text = "",
				device_token = req.body.device_token;
                            
			var query = socialModel.findOne({$and : [{social_id: social_id}, {provider: provider}]});
            query.exec(function (err, social) {
                if (err) {
                    console.log(err);
                    return res.json({ success : false, error : "Internal server error" });
                } else if (social) {
					
                } else {
					social = new socialModel();
                }

				social.social_id = social_id;
				social.friends = friends;
				social.provider = provider;
				social.name = name;
				social.photo_url = photo;
				social.location = "";
				social.device_token = device_token;

				social.save(function (err, social) {
					if (err) {
						console.log(err);
						return res.json({ success : false, error : "Internal server error" });
					} else {
						return res.json({ success : true });
					}
				});
            });
        },

		"post#social/ping" : function (req, res) {
            var social_id = req.body.social_id,
				provider = req.body.provider;
                            
			var query = socialModel.findOne({$and : [{social_id: social_id}, {provider: provider}]});
            query.exec(function (err, social) {
				if(err){
					return res.json({success : false});
				} else if (social) {
					return res.json({success : true, exist: true});
                }

				return res.json({success : true, exist : false})
            });
        },

		"post#echo/getStatus" : function (req, res) {
            var social_id = req.body.social_id,
				provider = req.body.provider;
                            
			var query = socialModel.findOne({$and : [{social_id: social_id}, {provider: provider}]});
            query.exec(function (err, social) {
                if (err) {
                    console.log(err);
                    return res.json({ success : false, error : "Internal server error" });
                } else if (social) {
                    return res.json({ success : true, status: social.echo_text != "" });					
                } else {
                    return res.json({ success : false, error : "Not found" });
                }
            });
        },

		"post#echo/create" : function (req, res) {
            var social_id = req.body.social_id,
				provider = req.body.provider,
				echo = req.body.echo,
				lat = req.body.lat,
				lng = req.body.lng;
                            
			var query = socialModel.findOne({$and : [{social_id: social_id}, {provider: provider}]});
            query.exec(function (err, social) {
                if (err) {
                    console.log(err);
                    return res.json({ success : false, error : "Internal server error" });
                } else if (social) {
					console.log('echo creation');
					social.echo_text = JSON.stringify({"echo": echo, "lat": lat, "lng": lng, time: new Date().getTime()});
					console.log(social);
					social.save();
                    return res.json({ success : true });					
                } else {
                    return res.json({ success : false, error : "Not found" });
                }
            });
        },

		"get#echo/text" : function(req, res){
			var social_id = req.query.id,
				provider = req.query.provider;

			requestModel.find({$or: [{'to_id': social_id}, {'from_id' : social_id}]}).sort({timestamp: -1}).exec(
				function(err,result) {
					console.log(err);
				    res.json(result);
				}
			);
		},

		"post#echo/get" : function (req, res) {
            var social_id = req.body.id,
				provider = req.body.provider;
                            
			var query = socialModel.findOne({$and : [{social_id: social_id}, {provider: provider}]});
            query.exec(function (err, social) {
                if (err) {
                    console.log(err);
                    return res.json({ success : false, error : "Internal server error" });
                } else if (social) {
					if(!social.friends || !social.friends.length){
						return res.json({success: true, echos: []});
					}

					socialModel.find({$and : [{social_id: {$in : social.friends}}, {provider: provider}]}).exec(function(err, friends){
						var echos = [];
						if(!friends || !friends.length){
							return res.json({success: true, echos: []});
						}

						for(var i = 0; i < friends.length; i++){
							var s = friends[i]
							var echo = {};
							if(s && s.echo_text && s.echo_text != ""){
								echo.echo = JSON.parse(s.echo_text);
								echo.social_id = s.social_id;
								echo.provider = s.provider;
								echo.photo_url = s.photo_url;
								echo.name = s.name;
								echo.request = false;
								echos.push(echo);
							}
						}

						requestModel.find({$or: [{'to_id': social_id}, {'from_id' : social_id}]}).sort({timestamp: 1}).exec(
							function(err,result) {
								var req = [];
								if(result){
									for(var i = 0; i < result.length; i++){
										var friend_id = "";
										if(result[i].from_id == social_id){
											friend_id = result[i].to_id;
										} else {
											friend_id = result[i].from_id;
										}

										for(var j = 0; j < friends.length; j++){
											if(!req[j]) req[j] = {};
											if(friend_id == friends[j].social_id){
												if(result[i].type == "1" && result[i].to_id == social_id){
													req[j].social_id = friends[j].social_id;
													req[j].provider = friends[j].provider;
													req[j].photo_url = friends[j].photo_url;
													req[j].name = friends[j].name;
													req[j].request = true;
													var location = JSON.parse(result[i].location);
													req[j].echo = {"echo":"You have received an echo request from \"" + friends[j].name + "\"", "lat":location.lat, "lng":location.lng, "time":result[i].timestamp};
												} else {
													req[j] = {};
												}
											}
										}
									}

									for(var j = 0; j < friends.length; j++){
										if(req[j] && req[j].social_id){
											for(var i = echos.length - 1; i >= 0; i--){
												if(echos[i].social_id == req[j].social_id){
													echos.splice(i, 1);
													echos.push(req[j]);
													break;
												}
											}
										}
									}

									console.log(echos);
									return res.json({success: true, echos: echos});

								} else {
									return res.json({success: true, echos: echos});
								}
							}
						);
						
					});				
                } else {
                    return res.json({ success : false, error : "Not found" });
                }
            });
        },

		"post#message/get" : function (req, res){
			var social_id = req.body.social_id,
				provider = req.body.provider;
		
		//	var social_id = req.query.social_id,
		//		provider = req.query.provider;

			console.log(social_id);
			console.log(provider);

			var query = socialModel.findOne({$and : [{social_id: social_id}, {provider: provider}]});
            query.exec(function (err, social) {
                if (err) {
                    console.log(err);
                    return res.json({ success : false, error : "Internal server error" });
                } else if (social) {
					if(!social.friends || !social.friends.length){
						return res.json({success: true, messages: []});
					}

					socialModel.find({$and : [{social_id: {$in : social.friends}}, {provider: provider}]}).exec(function(err, friends){
						var messages = [];
						if(!friends || !friends.length){
							return res.json({success: true, messages: []});
						}

						requestModel.find({$or: [{'to_id': social_id}, {'from_id' : social_id}]}).sort({timestamp: 1}).exec(
							function(err,result) {
								var req = [];
								if(result){
									for(var i = 0; i < result.length; i++){
										var friend_id = "";
										if(result[i].from_id == social_id){
											friend_id = result[i].to_id;
										} else {
											friend_id = result[i].from_id;
										}

										for(var j = 0; j < friends.length; j++){
											if(!req[j]) req[j] = {};
											if(friend_id == friends[j].social_id){
												if(result[i].type == "1" && result[i].to_id == social_id){
													req[j].from_id = friend_id;
													req[j].provider = friends[j].provider;
													req[j].photo_url = friends[j].photo_url;
													req[j].name = friends[j].name;
													req[j].text = "You have received an echo request from \"" + friends[j].name + "\"";
													req[j].timestamp = result[i].timestamp;
													req[j].is_picture = "NO";
													req[j].is_received = 1;
												} else {
													req[j] = {};
												}
											}
										}
									}

									console.log('--req');
									console.log(req);
									
									for(var j = 0; j < friends.length; j++){
										if(req[j] && req[j].from_id){
											messages.push(req[j]);
										}
									}
								}

								echoModel.find({$or: [{'to_id': social_id}, {'from_id' : social_id}]}).sort({_id: 1}).exec(
									function(err, echos) {
										var msgs = [];
										if(echos){
											for(var i = 0; i < echos.length; i++){
												var friend_id = "";
												if(echos[i].from_id == social_id){
													friend_id = echos[i].to_id;
												} else {
													friend_id = echos[i].from_id;
												}

												for(var j = 0; j < friends.length; j++){
													if(!msgs[j]) msgs[j] = {};
													if(friend_id == friends[j].social_id){
														if(echos[i].to_id == friend_id || echos[i].from_id == friend_id){
															msgs[j].from_id = friend_id;
															msgs[j].provider = friends[j].provider;
															msgs[j].photo_url = friends[j].photo_url;
															msgs[j].name = friends[j].name;
															if(echos[i].is_picture == "YES"){
																if(friend_id == echos[i].to_id){
																	msgs[j].text = "You have sent a picture to \"" + friends[j].name + "\"";
																} else {
																	msgs[j].text = "You have received a picture from \"" + friends[j].name + "\"";
																}
																msgs[j].is_picture = "YES";
															} else {
																msgs[j].text = echos[i].text;
																msgs[j].is_picture = "NO";
															}
															msgs[j].timestamp = echos[i].timestamp;
															if( !msgs[j].is_received ){
																msgs[j].is_received = 0;
															}
															if(echos[i].is_received == "NO"){
																msgs[j].is_received++;
															}
														} else {
															msgs[j] = {};
														}
													}
												}
											}
											
											for(var j = 0; j < friends.length; j++){
												if(msgs[j] && msgs[j].from_id){
													messages.push(msgs[j]);
												}
											}
										}

										console.log('hahaha');
										console.log(messages);
										return res.json({success: true, messages: messages});
								});
							}
						);
						
					});				
                } else {
                    return res.json({ success : false, error : "Not found" });
                }
            });
		},

		"post#echo/delete" : function (req, res) {
            var social_id = req.body.social_id,
				provider = req.body.provider,
				echo = req.body.echo,
				lat = req.body.lat,
				lng = req.body.lng;
                            
			var query = socialModel.findOne({$and : [{social_id: social_id}, {provider: provider}]});
            query.exec(function (err, social) {
                if (err) {
                    console.log(err);
                    return res.json({ success : false, error : "Internal server error" });
                } else if (social) {
					social.echo_text = "";
					social.save();
                    return res.json({ success : true });					
                } else {
                    return res.json({ success : false, error : "Not found" });
                }
            });
        },

		"get#social/print" : function( req, res) {
			console.log('why not working---');
			socialModel.find({}).exec(function( err, socials){
				res.json({socials: socials});
			});
		},

		"get#request/print" : function( req, res) {
			requestModel.find({}).exec(function( err, socials){
				res.json({socials: socials});
			});
		},

		"get#echo/print" : function( req, res) {
			echoModel.find({}).exec(function( err, socials){
				res.json({socials: socials});
			});
		}
        
        /*
		"post#objective/getObjectives" : function (req, res) {
            var userId = req.user._id;
			var company = (req.body.company)?req.body.company: req.user.company[0];
//			var query = objectiveModel.find({ $or : [{assignee: userId}, {assigner: userId}], company: company}).populate({path: 'files', options: {sort: {'created_at': -1 }}});
			var query = objectiveModel.find({ $or : [{assignee: userId}, {assigner: userId}], company: company}).populate({path: 'files', options: {sort: {'created_at': -1 }}});
       
            query.exec(function (err, objectives) {
                if (err) {
                    console.log(err);
                    return res.json({ objectives : [] });
                } else if(objectives) {
					var objs = [];

					function formatObjective(index){
						if(index >= objectives.length){
							return res.json({success: true, objectives: objs});
						}
						var o = {};
						o._id = objectives[index]._id;
						o.name = objectives[index].name;
						o.assigner = objectives[index].assigner;
						o.assignee = objectives[index].assignee;
						o.description = objectives[index].description;
						o.createdAt = objectives[index].createdAt;
						o.start = objectives[index].start;
						o.end = objectives[index].end;
						o.status = objectives[index].status;
						o.files = expandFiles({files: objectives[index].files}, req.user).files;

						async.parallel([
							function (callback) {
								commentModel.find({objective: o._id}, function(err, comments){
									if(comments){
										var result = [];

										for(var i = 0; i < comments.length; i++){
											var r = {};
											r.text = comments[i].comment;
											r.user = comments[i].user;
											r.action = "avatar";
											r.date = comments[i].date;
											r.timestamp = timestamp(comments[i].date, req.user.timezone);
											r.objective = comments[i].objective;
											r.files = comments[i].files;
											r.type = "comment";
											result.push(r);
										}
										callback(null, result);
									} else if(err) {
										callback(err);
									} else {
										callback(null, []);
									}
								});
							},
							function (callback) {
								eventModel.find({objective: o._id}).populate('user1 user2 task objective').exec(function(err, events){
									if(events){
										var result = [];
										for(var i = 0; i < events.length; i++){
											result.push(formatEvent(events[i], req.user));
										}
										callback(null, result);
									} else if(err) {
										callback(err);
									} else {
										callback(null, []);
									}
								});
							},
							function (callback) {
								taskModel.find({objective: o._id}, function(err, tasks){
									if(tasks){
										callback(null, tasks);
									} else if(err){
										callback(err);
									} else {
										callback(null, []);
									}
								});
							}
						], function (err, results) {
							if(err){
								res.json({success: false, message: "Internal Server Error"});
							} else {
								o.events = results[0];
								o.events = o.events.concat(results[1]);
								o.tasks = {};
								o.tasks.count = results[2].length;
								o.tasks.completed = 0;
								for(var i = 0; i < results[2].length; i++){
									if(results[2][i].status == 1 || results[2][i].status == 2) o.tasks.completed ++;
								}
								o.completeness = (o.tasks.count)?parseInt(parseFloat(o.tasks.completed) / parseFloat(o.tasks.count) * 100):0;
								objs.push(o);
								formatObjective(index + 1);
							}
						});
					}
					formatObjective(0);
				} else {
					return res.json({ objectives : []});
				}
            });
        },

		"post#objective/addFiles" : function (req, res) {
			var files = req.body.files,
				objective = req.body.objective,
				company = (req.body.company)?req.body.company: req.user.company[0];


			var query = userModel.find({_id : req.user._id});

			query.exec(function(err, user){
				if(user){
					objectiveModel.findOne({_id: objective}, function(err, obj){
						if(err) return res.json({success: false, message: "Internal Server Error1"});
						else if(obj){
							if(!obj.files) obj.files = [];
							for(var i = 0; i < files.length; i++){
								obj.files.push(files[i]._id);
							}
							obj.save(function(err, nObj){
								if(nObj) return res.json({success: true});
								else return res.json({success: false, message: "Internal Server Error2"});
							});
						} else return res.json({success: false, message: "Objective Not Found"});
					});
				} else {
					return res.json({success: false, message: "Internal Server Error3"});
				}
			});
		},
		
		"post#objective/delete" : function (req, res) {
			var objective = req.body.objective,
				company = (req.body.company)?req.body.company: req.user.company[0];
			
			console.log('-----');
			console.log(objective);
			console.log('-----');

			var query = userModel.find({_id : req.user._id});

			query.exec(function(err, user){
				if(user){
					objectiveModel.findOne({_id: objective}, function(err, obj){
						if(err) return res.json({success: false, message: "Internal Server Error"});
						else if(obj){
							obj.remove();
							res.json({success: true});
						} else return res.json({success: false, message: "Objective Not Found"});
					});
				} else {
					return res.json({success: false, message: "Internal Server Error3"});
				}
			});
		}

		*/
    }
}
var request = require("request");
var path = require("path");
var cheerio = require("cheerio");
var epub = require('epub-gen');
var fs = require('fs');
var url = require('url');

module.exports = function(args) {
	var i = require("./../../index");
	var sid = path.basename(args._[0]);

	//Getting Chapter List

	request({ uri: "https://www.literotica.com/s/"+sid }, function(err, response, body) {
		if (err) { console.error("Failed to download Ebook (use --debug flag to see more detailed errors)");i.debug("Failed to get chapter list"); i.debug(err); i.stop();}
		else if (response.statusCode == 200) {
			var $ = cheerio.load(body);
			var author_url = $('span.b-story-user-y > a').attr('href');
			if (author_url) {
				i.debug("Searching author submissions for series");
				request({ uri: author_url }, function(author_err, author_response, author_body) {
					if (author_err) { console.error("Failed to download Ebook (use --debug flag to see more detailed errors)"); i.debug("Failed to aquire author submission page"); i.debug(author_err); i.stop();}
					else if (author_response.statusCode == 200) {
						var $ = cheerio.load(author_body);
						var anchors = $('a.bb:not(.nobck)');
						var story_key = sid.split("-").slice(0,-1).join("-");
						var chapters = [];
						Object.keys(anchors).forEach( anchor => {
							var a = $(anchors[anchor]).attr('href');
							if (a !== undefined) if (a.includes(story_key)) chapters.push(a);
						});
						
						if (chapters.length == 0) {
							i.debug("One-off story detected");

							// Single Story Retrieval //

						    request({
								uri: "https://www.literotica.com/s/"+sid,
							}, function(err, response, body) {
									if (err) {console.error("Failed to download Ebook (use --debug flag to see more detailed errors)"); i.debug("Error occured while getting number of pages"); i.debug(err);i.stop();}
									else {
										var $ = cheerio.load(body);
										var story_title = $('div.b-story-header > h1').text();
										var story_author = $('div.b-story-user-y > a').text();
										if ($("select[name=page]") === undefined) {

											// One Page Story //
											
											i.debug("One Paged Story Detected");
											i.debug("Compiling Book");
											return compile({
												type: 'ss', 
												meta: {
													title: $('div.b-story-header > h1').text(), 
													author: $('div.b-story-user-y > a').text()
												}, 
												content: $("div.b-story-body-x").html(),
												args: args
											});
										
										} else {

											// Multiple Paged Story //

											i.debug("Multi Page Story Detected");
											var page_data = [];
											var pages = $("select[name=page]").children().length;

											for (var p = 1; p <= pages; p++) {
												i.debug("Downloading Page "+p);
												request({
													uri: "https://www.literotica.com/s/"+sid+"?page="+p,
												}, function(error, response, body) {
													var page = url.parse(response.request.uri.href, true).query.page;
													if (error) {
														console.error("Failed to download Ebook (use --debug flag to see more detailed errors)");
														i.debug("Failed to retreive page "+page);
														i.debug(error);
														i.stop();
													} else if (response.statusCode == 404) {
														console.error("Failed to download Ebook (use --debug flag to see more detailed errors)");
														i.debug("Failed to retreive page "+page+" (404 Status Code)");
														i.stop();
													} else if (response.statusCode == 200) {
														i.debug("Page "+page+" Downloaded");
														var $ = cheerio.load(body);
														page_data[page-1] = { 
															data: $("div.b-story-body-x").html(),
															title: $('div.b-story-header > h1').text()
														};

														if (page == pages) {
															i.debug("Compiling Book");
															return compile({
																type: 'sm',
																meta: {
																	title: story_title,
																	author: story_author
																},
																content: page_data,
																args: args
															});
														}
													} else {
														console.error("Failed to download Ebook (use --debug flag to see more detailed errors)")
														i.debug("Unknown Server Error Occurred ("+response.statusCode+" Status Code)");
														i.stop();
													}
												});
											}

										}
									}
							});							
						} else {
							i.debug("Series detected, "+chapters.length+" chapters found");
							getAllChapters(chapters);
						}
					}
				});
			} else {
				console.error("Failed to download Ebook (use --debug flag to see more detailed errors)")
				i.debug("Failed to aquire author submission page");
				i.stop();
			}
		} else if (response.statusCode == 404) {
			console.error("Invalid Story ID (404 Status Code)");
			i.stop();
		}
	});
}

function compile(data) {
	var i = require("./../../index");
	var format = data.args.format;
	var output = data.args.output;

	if (output !== undefined) {
		if (output.endsWith('/')) {
			var filename = output+data.meta.title+'.'+format;
		} else if (output.endsWith('.'+format)) {
			var filename = output;
		} else {
			var filename = output+'.'+format;
		}
	} else {
		var filename = './'+data.meta.title+'.'+format;
	}

	if (data.type == "ss") {
		if (format == "epub") {
			new epub({
				title: data.meta.title,
				author: data.meta.author,
				content: [data.content]
			}, filename).promise.then(
			() => {console.log("Successfully downloaded Ebook ("+filename+")"); i.stop()}, 
			(err) => {
				if (err) {
					console.error("Failed to download Ebook (use --debug flag to see more detailed errors");
					i.debug("Failed to compile pages into Ebook");
					i.debug(err);
					i.stop();
				}
			});
		}
	} else if (data.type == "sm") {
		if (format == "epub") {
			new epub({
				title: data.meta.title,
				author: data.meta.author,
				content: data.content
			}, filename).promise.then(
			() => {console.log("Successfully downloaded Ebook ("+filename+")"); i.stop()}, 
			(err) => {
				if (err) {
					console.error("Failed to download Ebook (use --debug flag to see more detailed errors");
					i.debug("Failed to compile pages into Ebook");
					i.debug(err);
					i.stop();
				}
			});
		}
	}
}

function getSingleStory(sid) {
	getAllPages(sid, function(story_html, title, author) {
		
		if (argv.output !== undefined) {
			if (argv.output.endsWith('/')) {
				var filename = argv.output+title+'.'+argv.format;
			} else if (argv.output.endsWith('.'+argv.format)) {
				var filename = argv.output;
			} else {
				var filename = argv.output+'.'+argv.format;
			}
		} else {
			var filename = './'+title+'.'+argv.format;
		}

		if (argv.format == 'epub') {
			new epuber({
				title: title,
				author: author,
				content: [{ title: "Chapter 1", css: 'p {font-family: "helvetica";}', data: story_html }]
			}, filename).promise.then(function() {
				console.log("Successfully downloaded Ebook ("+filename+")");
				timers.clearInterval(workIndicator);
			}, function(err) {
				if (err) {
					timers.clearInterval(workIndicator);
					console.error("Failed to download Ebook (use --debug flag to see more detailed errors");
					debug(err);
				}
			});
		} else if (argv.format == 'html') {
			fs.writeFile(filename, story_html, function(err) {
				if (err) {
					timers.clearInterval(workIndicator);
					console.error("Failed to download Ebook (use --debug flag to see more detailed errors");
					debug(err);
				}
			});
				
		}
	});
}

function findChapterList(sid) {
	debug("Getting Chapter List...");
	request({ uri: "https://www.literotica.com/s/"+sid }, function(err, response, body) {
		if (err) { console.error("Failed to get chapter list"); }
		else if (response.statusCode == 200) {
			var $ = cheerio.load(body);
			var author_url = $('span.b-story-user-y > a').attr('href');
			debug("Searching author submissions for series");
			if (author_url) {
				request({ uri: author_url }, function(author_err, author_response, author_body) {
					if (author_err) { timers.clearInterval(workIndicator); console.error("Failed to aquire author submission page"); debug(author_err); }
					else if (author_response.statusCode == 200) {
						var $ = cheerio.load(author_body);
						var anchors = $('a.bb:not(.nobck)');
						var story_key = sid.split("-").slice(0,-1).join("-");
						var chapters = [];
						Object.keys(anchors).forEach( anchor => {
							var a = $(anchors[anchor]).attr('href');
							if (a !== undefined) {
								if (a.includes(story_key)) {chapters.push(a);}
							}
						});
						debug(chapters.length+" Chapters Found");
						getAllChapters(chapters); 
					}
				});
			} else {
				timers.clearInterval(workIndicator);
				console.error("Failed to aquire author submission page");
			}
		}
	});
}


function getAllChapters(chapters, callback, chapter, title, author) {
	chapter = chapter || 0;
	if (chapters[chapter] === undefined) {
		if (argv.output !== undefined) {
			if (argv.output.endsWith('/')) {
				var filename = argv.output+title+'.'+argv.format;
			} else if (argv.output.endsWith('.'+argv.format)) {
				var filename = argv.output;
			} else {
				var filename = argv.output+'.'+argv.format;
			}
		} else {
			var filename = './'+title+'.'+argv.format;
		}

		new epuber({
			title: title,
			author: author,
			content: story_content
		}, filename).promise.then(function(){
			timers.clearInterval(workIndicator);
			console.log("Successfully created ebook with "+chapter+" chapters");
		}, function(err){
			if (err) {timers.clearInterval(workIndicator);console.error("Failed to create ebook (run with --debug flag for extra output)");debug(err);}

		});
	} else {
		debug("Gathering Chapter "+(chapter+1));
		getAllPages(path.basename(chapters[chapter]), function(story_data, ch_title, ch_author){
			story_content.push({ title: "Chapter "+(chapter+1), css: "p {font-family: 'helvetica'}", data: story_data });
			if (title) {ch_title = title;}
			if (author) {ch_author = author;}
			getAllChapters(chapters, callback, chapter+1, ch_title, ch_author);
		});
	}

}

function getAllPages(story_id, callback, story_html, p) {
	var p = p || 1;
	var story_html = story_html || "";
	request({
		uri: "https://www.literotica.com/s/"+story_id+"?page="+p,
	}, function(error, response, body) {
		if (argv.debug)
			console.log("Downloading Page "+p+"...");
		if (error) {
			console.error("Story Retrevial Failed");
			if (argv.debug) {console.error(error);}
		} else if (response.statusCode == 404) {
			console.error("Story ID is invalid (404 Error)");
		} else if (response.statusCode == 200) {
			var $ = cheerio.load(body);
			story_html += $("div.b-story-body-x").html();
			var pages = $("select[name=page]").children().length;
			if (p + 1 <= pages) {
				getAllPages(story_id, callback, story_html, p+1);
			} else {
				var title = $('div.b-story-header > h1').text();
				var author = $('div.b-story-user-y > a').text();
				callback(story_html, title, author);
			}
		} else {
			timers.clearInterval(workIndicator);
			console.error("Unknown Server Error Occurred");
		}
	});
}

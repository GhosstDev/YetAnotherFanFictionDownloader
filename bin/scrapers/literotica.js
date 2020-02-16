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
						var story_key = sid.split("-").slice(0,-3).join("-");
						var chapters = [];
						i.debug("STORY_KEY = "+story_key);
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
										var story_author = $('span.b-story-user-y > a').text();
										var pages = $("select[name=page]").children().length;
										if (pages <= 0) {
						
											// One Page Story //
											
											i.debug("One Paged Story Detected");
											compile({
												meta: {
													title: story_title, 
													author: story_author
												}, 
												content: [{title: story_title, data: $("div.b-story-body-x").html()}],
												args:args
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
														page_data[page-1] = $("div.b-story-body-x").html();
														if (page_data.length == pages) {
															compile({
																meta: {
																	title: story_title,
																	author: story_author
																},
																content: [{title: story_title, data: page_data.join()}],
																args:args
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

							// Series Story Detected //

							i.debug("Series detected, "+chapters.length+" chapters found");
							getAllChapters(chapters, function(story_data) {
								i.debug("Compiling Story");
								i.debug("AUTHOR = "+chapters[0].author);
								i.debug("TITLE = "+chapters[0].title);
								compile({
									meta: {
										title: chapters[0].title,
										author: chapters[0].author
									},
									content: story_data,
									args: args
								});
							});
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

function getAllChapters(chapters, callback, chapter, chapter_data) {
	var i = require('../../index');
	var chapter = chapter || 0;
	var chapter_data = chapter_data || [];
	i.debug("Downloading Chapter "+(chapter+1)+" ["+path.basename(chapters[chapter])+"]");
	getChapter(path.basename(chapters[chapter]), function(content, title, author){
		i.debug("Downloaded Chapter "+(chapter+1));
		chapter_data[chapter] = {title: title, author: author, data: content.join()};
		if (chapters.length == chapter+1) {
			callback(chapter_data);
		} else {
			getAllChapters(chapters, callback, chapter+1, chapter_data);
		}
	});
}


function getChapter(sid, _callback) {
	var i = require("../../index");
	request({
		uri: "https://www.literotica.com/s/"+sid,
	}, function(err, response, body) {
			if (err) {console.error("Failed to download Ebook (use --debug flag to see more detailed errors)"); i.debug("Error occured while getting number of pages"); i.debug(err);i.stop();}
			else {
				var $ = cheerio.load(body);
				var story_title = $('div.b-story-header > h1').text();
				var story_author = $('span.b-story-user-y > a').text();
				var pages = $("select[name=page]").children().length;
				if (pages <= 0) {

					// One Page Story //
					
					i.debug("One Paged Story Detected");
					_callback([$("div.b-story-body-x").html()], story_title, story_author);
				
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
								page_data[page-1] = $("div.b-story-body-x").html();
								if (page_data.length == pages) {
									_callback(page_data, story_title, story_author);
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
}
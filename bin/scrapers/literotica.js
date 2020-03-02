const axios = require('axios').default;
const clk = require('chalk');
const path = require("path");
const cheerio = require("cheerio");
const gen = require('../gen/epub');

module.exports = function(args) {
	const i = require("./../../index");
	var bar = i.bar;
	var sid = path.basename(args.url);
	var progData = {task: "Getting Info"};
	bar.tick(progData);

	return new Promise(function(resolve, reject){
		try {
			//Getting Chapter List
			axios({
				url: "https://www.literotica.com/s/"+sid,
				method: "GET"
			})
			.then((chapter_res) => {
				i.debug("Retreived Chapter List"); bar.tick(progData);
				const storyC = cheerio.load(chapter_res.data);
				var author_url = storyC('span.b-story-user-y > a').attr('href');
				if (author_url) {
					
					//Search author submissions for series
					i.debug("Retrieving Author Submissions Page"); bar.tick(progData);
					axios.get(author_url)
					.then(author_res => {

						i.debug("Retrieved Author Submission Page"); bar.tick(progData);
						const authorC = cheerio.load(author_res.data);
						var anchors = authorC('a.bb:not(.nobck)');
						var story_key = sid.split("-").slice(0,-1).join("-").replace(/(-ch-([0-9]){1,3})\b/g, "");
						var chapters = [];
						i.debug(clk.cyan("STORY_KEY = "+story_key));

						//Search for all anchors with a href containing the STORY_KEY
						bar.tick(progData);
						Object.keys(anchors).forEach( anchor => {
							var a = authorC(anchors[anchor]).attr('href');
							if (a !== undefined) if (a.includes(story_key)) chapters.push(axios.get(a));
						});

						//Ensures That All Chapters Are Fetched Before Compile
						const completed_chapters = [];
						chapters.forEach((v, i) => {completed_chapters[i] = false;});
						const sData = {
							meta: {
								title: storyC('div.b-story-header > h1').text(),
								author: storyC('span.b-story-user-y > a').text(),
								keywords: storyC('meta[name=keywords]').attr('content'),
								description: storyC('meta[name=description]').attr('content')
							},
							content: []
						};
						
						bar.tick(progData);
						progData.task = "Getting Story Elements";
						axios.all(chapters)
						.then(axios.spread((...reqData) => {
							bar.tick(progData);					
							for (var cIndex = 0; cIndex < reqData.length; cIndex++) {
								var sChapter = reqData[cIndex];
								var $ = cheerio.load(sChapter.data);
								var pages = $("select[name=page]").children().length;							
								if (pages == 1) {
									sData.content[cIndex] = {
										title: $('div.b-story-header > h1').text(), 
										data: $("div.b-story-body-x").html()
									};
									completed_chapters[cIndex] = true;
									var complete = true;
									completed_chapters.forEach(cState => {if (!cState) complete = false;});
									if (complete === true) {compile(sData);}
								} else {
									var pageAxios = [];
									for (let p = 1; p <= pages; p++) {pageAxios[p-1] = axios.get(`https://www.literotica.com/s/${sid}?page=${p}`);}
									var queryPages = function(chapterIndex) {
										axios.all(pageAxios).then((...pageRes) => {
											pageRes.forEach(function(result) {
												let sTitle = "";
												let chData = "";
												Object.keys(result).forEach(function(pData, index, arr){
													var pageHTML = cheerio.load(result[pData].data);
													sTitle = pageHTML('div.b-story-header > h1').text(); 
													chData += pageHTML("div.b-story-body-x").html();		
													
													if (pData == arr.length-1) {
														sData.content[chapterIndex] = {
															title: sTitle, 
															data: chData
														};
														completed_chapters[chapterIndex] = true;
														var complete = true;
														completed_chapters.forEach(cState => {if (!cState) complete = false;});
														if (complete === true) {compile(sData);}
													}
												});
											});
											
										}).catch(err => {handleAxiosError(err, "Retrieval of Chapter Data")});
									};
									queryPages(cIndex);
								}
							}
						})).catch(err => {handleAxiosError(err, `Retrieval of Chapters`);});

					}).catch(err => {handleAxiosError(err, "Retrieval of Author Submission Page")});
				} else {
					i.error();
					i.debug("Failed to Retrieve Author Submission Page");
				}

			//Get Chapter List Error
			}).catch((err) => {handleAxiosError(err, "Aquiring Chapter List")});

			function compile(data) {
				var i = require("./../../index");
				var format = i.argv.format;
				var output = i.argv.output;
			
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
					gen({
						file: filename,
						title: data.meta.title,
						content: data.content,
						author: data.meta.author,
						keywords: data.meta.keywords,
						description: data.meta.description
					}).then(function(res) {
						resolve(res);
					}).catch(function(error) {
						i.error();
						i.debug(error);
						throw error;
					});
				}
			}
			
			function handleAxiosError(error, event) {
			
				const i = require('../../index');
			
				i.error();
				i.debug(`Event \`${event}\` Failed`); 
				if (error.response) {
					// The request was made and the server responded with a status code
					// that falls out of the range of 2xx
					i.debug("Non 200/OK Response From Server");
					i.debug(error.response.data);
					i.debug(error.response.status);
					i.debug(error.response.headers);
				  } else if (error.request) {
					// The request was made but no response was received
					// `error.request` is an instance of XMLHttpRequest in the browser and an instance of
					// http.ClientRequest in node.js
					i.debug("No Response Recieved During Axios Request");
					i.debug(error.request);
				  } else {
					// Something happened in setting up the request that triggered an Error
					i.debug("Error During Axios Request Setup");
					i.debug(error.message);
				  }
				  i.debug(error.config);
			
			}

		} catch (error) {
			reject(error);
		}
	});
}




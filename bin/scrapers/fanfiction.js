var axios = require("axios");
var path = require("path");
var cheerio = require("cheerio");
var gen = require('../gen/epub');
var url = require('url');

module.exports = (args) => {

}

function getChapters(url, _cb) {
    var i = require('../../index');
    axios({
        url: url,
        method: 'get'
    })
    .then(function(data){
        i.debug(data.status);
        var $ = cheerio.load(data.data);
        return decode($('div[aria-label="story content"]').html());
    });
}
const helpers = require('require-all')({'dirname': __dirname +'/scrapers'});
const scrapers = {
    literotica: /^(http(s)?:\/\/)?(www\.)?literotica\.com\/s\/([-a-zA-Z0-9@:%_\+.~#?&//=]*){2,}/,
    fanfiction: /^(http(s)?:\/\/)?(www\.)?(m\.)?fanfiction\.net\/s\/([0-9])+\/([0-9])+\/([-a-zA-Z0-9@:%_\+.~#?&//=]*)/
}

module.exports = function(args) {
    var i = require('./../index');
    var matched = false;
    return new Promise(function(resolve, reject) {
        Object.keys(scrapers).forEach(function(scraper){   
            if (args.url.match(scrapers[scraper])) {
                matched = true;
                i.debug("Matched URL: "+scraper);
                resolve(helpers[scraper]({
                    url: args.url,
                    format: args.format,
                    output: args.output
                }));
            }
        });
    
        if (matched == false) {i.error("Url does not match with supported sites"); reject();}
    });
}
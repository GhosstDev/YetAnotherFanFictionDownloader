var yarg = require('yargs');
var scraper_helpers = require('require-all')({'dirname': __dirname +'/scrapers'});
var scrapers = {
    'literotica': /^(http(s)?:\/\/)?(www\.)?literotica\.com\/s\/([-a-zA-Z0-9@:%_\+.~#?&//=]*){2,}/,
}

module.exports = function(args) {
    var i = require('./../index');
    var matched = false;
    Object.keys(scrapers).forEach(function(scraper){   
        if (args._[0].match(scrapers[scraper])) {
            matched = true;
            i.debug("Matched URL: "+scraper);
            scraper_helpers[scraper](args);
        }
    });

    if (matched == false) {
        console.error("ERROR: Url does not match with supported sites");
        yarg.showHelp();
        i.stop();
    }
}
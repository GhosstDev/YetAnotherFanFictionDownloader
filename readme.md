# (YAFFS) Yet Another FanFiction Scraper
A full fanfiction story downloader
Currently supports:
- Literotica.com

Currently working to support:
- Fanfiction.net
- Archiveofourown.com

## Installation

Use the package manager [npm](https://www.npmjs.com/) to install yaffs.

```bash
npm install yaffs --global
```

## Usage

### CLI

```bash
yaffs <url> [Options] 
    [--debug, -d] Render Debug Information 
    [--diableProgress] Disabled The Progress Bar
    [--output, -o] Output Directory/File
    [--format, -f] Output format (epub only currently)
    [--help, -h] This prompt
```

### Node.JS

```nodejs
const yaffs = require("yaffs").scraper;

yaffs({
    url: <url>,
    format: 'epub', //[optional]
    output: <directory | file> //[optional]
}).then(function(result){
    console.log(result); //returns ebook's filepath
}).catch(function(error){
    console.error(error);
});
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[MIT](https://choosealicense.com/licenses/mit/)

## Donate
If you'd like to donate and allow me to make more features, you can do so here

[![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=Z6M89MH8VKGZC&currency_code=USD&source=urlA)

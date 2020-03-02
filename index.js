#!/usr/bin/env node
var yargs = require("yargs");
var scraper = require('./bin/scraper');
var prog = require('progress');
var clk = require('chalk');
var argv = yargs
.option('debug', {
    alias: 'd',
    description: "Enables debug output",
    type: 'boolean'
})
.option('format', {
    alias: 'f',
    description: 'Ebook output format',
    default: 'epub',
    choices: ['epub']
})
.option('output', {
    alias: 'o',
    description: 'Output location',
    type: 'string',
    default: './'
})
.option('disableProgress', {
    description: 'Disabled Displaying of Progress Bar',
    type: 'boolean'
})
.usage('Usage: yaffs <story url> [Options]')
.command('url')
.help()
.alias('help', 'h')
.alias('help', '?')
.argv;
const bar = new prog(':task: [:bar]', {width: 18, total: 9,complete: '=',incomplete: ' '});
if (argv.debug || argv.disableProgress || argv._[0] == "") {exports.bar = {tick: function(object){}};} else {exports.bar = bar;}
exports.argv = argv;
exports.error = function(message, code) {var code = code || 1; var msg = message || "Failed to download Ebook (use --debug flag to see more detailed errors)"; console.log("");console.error(`[${clk.red("ERROR")}]: ${clk.redBright(msg)}`);}//process.exit(code);};
exports.debug = function(message) {if (argv.debug) console.debug(`[${clk.blue("DEBUG")}]: ${message}`);};
exports.scraper = scraper;

if (argv._[0] != undefined) {
    scraper({
        url: argv._[0],
        format: argv.format,
        output: argv.output
    }).then(function(response) {
        console.log(response);
    }).catch(function(error) {
        console.error(error);
    });
}

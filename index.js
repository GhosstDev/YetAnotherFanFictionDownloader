#!/usr/bin/env node
var yargs = require("yargs");
var exec = require('child_process').exec;
var timers = require('timers');
var scraper = require('./bin/scraper');

var args = process.argv.slice(2);
var argv = yargs
    .option('debug', {
        alias: 'd',
        description: "Enables debug output",
        type: 'boolean'
    })
    .option('format', {
        alias: 'f',
        description: 'Ebook output format (EPUB, HTML) Default: epub',
        default: 'epub',
        choices: ['epub', 'html']
    })
    .option('output', {
        alias: 'o',
        description: 'Output location Default: ./',
        type: 'string',
        default: './'
    })
    .usage('Usage: yaffs <story url> [Options]')
    .command('url')
    .demandCommand()
    .help()
    .alias('help', 'h')
    .argv;

exports.debug = function(message, inline) {var inline = inline || false; if (argv.debug) {if (inline) {process.stdout.write(message);} else {console.debug("[DEBUG]: "+message);}}};
exports.stop = function() {timers.clearInterval(workIndicator);}
var workIndicator = timers.setInterval(function() {process.stdout.write(".");}, 1000);
scraper(argv);
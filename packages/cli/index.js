#!/usr/bin/env node
'use strict';
var path = require('path');
var qs = require('querystring');

var _ = require('lodash');
var simpleTimestamp = require('simple-timestamp');
var Elapsed = require('elapsed');
var antwar = require('antwar');
var chalk = require('chalk');
var program = require('commander');
var upperCaseFirst = require('upper-case-first');
var promiseFinally = require('promise-finally');

require('es6-promise').polyfill();

var lib = require('./lib');
var version = require('./package.json').version;

main();

function main() {
    var prettyConsole = {
        log: function() {
            console.log(simpleTimestamp(), chalk.green.apply(null, arguments));
        },
        info: function() {
            console.info(simpleTimestamp(), chalk.blue.apply(null, arguments));
        },
        error: function() {
            console.error(simpleTimestamp(), chalk.bold.red.apply(null, arguments));
        },
        warn: function() {
            console.warn(simpleTimestamp(), chalk.yellow.apply(null, arguments));
        },
    };
    var now = new Date();
    var defaultConfig = {
        webpackConfig: './webpack.config.js',
        blogRoot: 'blog',
        port: 3000,
        output: 'build',
        boilerplate: 'antwar-boilerplate',
        deploy: {
            branch: 'gh-pages',
        },
        console: prettyConsole,
    };

    program.version(version).
        option('-c, --config <file>', 'Path to configuration file ' +
            '(defaults to antwar.config.js) or `site` configuration as a querystring').
        option('-i, --init <directory>', 'Initialize a project').
        option('-I --install <theme>', 'Install a theme and attach it to project').
        option('-p, --plugin <directory>', 'Initialize a plugin').
        option('-b, --build', 'Build site').
        option('-l --list', 'List Antwar related packages').
        option('-s, --serve [port]', 'Serve site. Port (defaults to ' +
            defaultConfig.port + ')', parseInt).
        option('-D --deploy', 'Deploy to branch (defaults to ' +
            defaultConfig.deploy.branch + ')').
        option('-d, --develop', 'Open a browser in development mode');

    program.parse(process.argv);

    // TODO: this would be a good place to validate configuration (push to core)
    // + show warnings about possible misspellings etc.
    var config = defaultConfig;

    // do not try to get antwar configuration when initializing a new project
    if(!program.init) {
        config = getConfig(
            defaultConfig,
            program.config
        );
    }

    config.port = parseInt(program.serve) || config.port;
    config.output = program.init || program.plugin || config.output;

    // XXX: this can probably be merged somehow (map?)
    if(program.init) {
        execute(config.console, now, 'project initialization', lib.init, config, function() {
            config.console.info(
                'Go to `' + config.output +
                '` and hit `npm start` to get started'
            );
        });
    }
    else if(program.install) {
        config.theme = program.install;

        execute(config.console, now, 'installing', lib.install, config);
    }
    else if(program.plugin) {
        config.boilerplate = 'antwar-plugin-boilerplate';

        execute(config.console, now, 'plugin initialization', lib.init, config);
    }
    else if(program.build) {
        execute(config.console, now, 'building', antwar.build, config);
    }
    else if(program.serve) {
        execute(config.console, now, 'serving', lib.serve, config);
    }
    else if(program.list) {
        execute(config.console, now, 'listing', lib.list, config);
    }
    else if(program.deploy) {
        execute(config.console, now, 'deployment', lib.deploy, config);
    }
    else if(program.develop) {
        execute(config.console, now, 'developing', antwar.develop, config);
    }
    else if(!process.argv.slice(2).length) {
      program.outputHelp();
    }
}

function execute(console, startTime, name, command, config, doneCb) {
    doneCb = doneCb || noop;

    var upperCasedName = upperCaseFirst(name);

    console.log('Start ' + name + '\n');

    var p = command(config).then(function() {
        console.log('\n' + upperCasedName + ' finished');

        doneCb();
    }).catch(function(err) {
        console.error('\n' + upperCasedName + ' failed', err);
    });

    promiseFinally.default(p, function() {
        showElapsedTime(console, startTime);
    });
}

function noop() {}

function showElapsedTime(console, a, b) {
    var elapsedTime = (new Elapsed(a, b || new Date()));

    console.info('\nTime elapsed:', elapsedTime.optimal || elapsedTime.milliSeconds + ' ms');
}

function getConfig(defaultConfig, config) {
    try {
        var loadedConfig = {};

        // priority 1. qs 2. provided path 3. antwar.config.js
        // if nothing of these works, just use defaultConfig instead

        // assume it's a querystring if there's even one =
        // TODO: note that this doesn't parse nested properties (ie. foo.bar=34)
        // it might be nice to support that as well
        if(config && config.indexOf('=') > 0) {
            loadedConfig = qs.parse(config);
        }
        else {
            try {
                loadedConfig = require(
                    path.join(process.cwd(), program.config || 'antwar.config.js')
                );
            } catch(e) {
                console.error(e);
            }
        }

        return _.merge(defaultConfig, loadedConfig);
    } catch(e) {
        console.error(e);
    }

    return defaultConfig;
}
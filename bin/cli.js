#!/usr/bin/env node

const cmdline = require('../');
const pkg = require('../package.json');

cmdline
  .version(pkg.version)
  .help('info')
  .error(function (err) {
    console.error(err.message);
    process.exit(1);
  })
  .option('-t', 'switch')
  .command('start')
  .root.action(function ($1, $2) {
    console.log('argv:', $1);
    //return false;
  }, false)
  .action(function ($1) {
    console.log('default:', $1);
    console.log('has t:', this.has('t'));
  }, false)
  .ready();
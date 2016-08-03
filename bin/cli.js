#!/usr/bin/env node

const cmdline = require('../');
const pkg = require('../package.json');

cmdline
  .version(pkg.version)
  .help('info')
  .option('-t', { type: 'switch' })
  .command('start', function (cmd, t) {
    console.log('cmd:', cmd, t);
    //return false;
  }, true)
  .handle({ arguments: true }, function ($0, $1) {
    console.log('argv:', $0);
    //return false;
  })
  .handle(function (t) {
    console.log('default:', t);
  })
  .ready();
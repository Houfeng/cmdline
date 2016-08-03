#!/usr/bin/env node

const cmdline = require('../');
const pkg = require('../package.json');

cmdline
  .version(pkg.version)
  .help('info')
  .option('-t')
  .command('start', function (cmd, t) {
    console.log('cmd:', t);
    //return false;
  }, false)
  .handle({ arguments: true }, function ($0, $1) {
    console.log('argv:', $0);
    //return false;
  })
  .handle(function (t) {
    console.log('default:', t);
  })
  .ready();
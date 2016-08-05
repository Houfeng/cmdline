#!/usr/bin/env node

const cmdline = require('../');
const pkg = require('../package.json');

cmdline
  .version(pkg.version)
  .help('info')
  .error(function (err) {
    console.error('ERR:', err.message);
    process.exit(1);
  })
  .option('-t', { command: '', type: 'switch' })
  .command('start', function (cmd, t) {
    console.log('cmd:', t);
    //return false;
  }, true)
  .handle({ arguments: true }, function ($0, $1) {
    console.log('argv:', $0);
    //return false;
  })
  .handle(function ($0) {
    console.log('default:', $0);
    console.log('has t:', this.has('t'));
  })
  .ready();
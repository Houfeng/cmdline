#!/usr/bin/env node

const cmdline = require('../');
const pkg = require('../package.json');

cmdline
  .version(pkg.version)
  .help('info')
  .command('start', function (cmd, $0) {
    console.log('cmd:', cmd, $0);
  }, true)
  .handler({ argc: 1 }, function ($0) {
    console.log('argv:', $0);
  })
  .handler(function () {
    console.log('default:', 'test');
  })
  .ready();
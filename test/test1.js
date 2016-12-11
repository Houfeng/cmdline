const Command = require('../').Command;

const command = new Command();

command
  .option(['-t', '--tab'], 'number')
  .option(['-x'], 'number')
  .action(function (command, $1) {
    console.log('command:', command);
  }, false)
  .command(/[\S\s]*/)
  .option(['-t', '--tab'], 'number')
  .option(['-x'], 'number')
  .action(function (cmd) {
    console.log(cmd);
  })
  .ready();

console.log('argv:', command.argv);
console.log('options:', command.options);
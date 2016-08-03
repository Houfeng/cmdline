const Parser = require('../').Parser;

const parser = new Parser({
  argv: ["abv", "-tx", "9", "c a", "b"]
});

parser
  .option(['-t', '--tab'], {
    regexp: /[0-9]+/i,
    default: 1
  })
  .handler(function (command) {
    console.log('command1:', command);
  })
  .command(/./, function (command) {
    console.log('command2:', command);
  })
  .ready();

console.log('argv:', parser.argv);
console.log('options:', parser.options);
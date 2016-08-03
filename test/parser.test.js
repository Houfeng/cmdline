const Parser = require('../').Parser;

const parser = new Parser(["abv", "-t", "c a", "b"]);

parser
  .error(function (err) {
    console.log(err.message);
  })
  .option(['-t', '--tab'], {
    regexp: /./i
  })
  .command(/./, function (command) {
    console.log('command:', command);
  })
  .ready();

console.log('argv:', parser.argv);
console.log('options:', parser.options);
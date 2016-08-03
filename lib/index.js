const Parser = require('./parser');

const parser = new Parser(process.argv.slice(2));
parser.Parser = Parser;

module.exports = parser;
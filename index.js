const Command = require('./lib/command');
const Option = require('./lib/option');
const Type = require('./lib/type');
const types = Type.types;
const Action = require('./lib/action');
const Argument = require('./lib/argument');

const program = new Command();

program.Command = Command;
program.Option = Option;
program.Action = Action;
program.Type = Type;
program.types = types;
program.Argument = Argument;

module.exports = program;
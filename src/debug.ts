import { Command } from ".";

const command = new Command();

command
  .error(err => {
    // console.error(err);
  })
  .option(["-t", "--tab"], "number")
  .option(["-x"], "number")
  .action(async (command, $1) => {
    console.log("command:", command, $1);
    throw new Error("test error");
  }, false)
  // .command(/[\S\s]*/)
  // .option(["-t", "--tab"], "number")
  // .option(["-x"], "number")
  // .action(cmd => {
  //   console.log(cmd);
  // })
  .ready();

console.log("argv:", command.argv);
console.log("options:", command.options);

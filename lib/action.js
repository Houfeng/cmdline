const Class = require('cify').Class;

const Action = new Class({
  constructor: function (handler, required) {
    this.handler = handler;
    this.required = required;
  }
});

const ActionCollection = new Class({
  $extends: Array
});

Action.Collection = ActionCollection;

module.exports = Action;
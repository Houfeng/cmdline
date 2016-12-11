const Class = require('cify').Class;
const utils = require('ntils');
const types = require('./type').types;

const Argument = new Class({

  constructor: function (type) {
    this.type = utils.isString(type) ? types.get(type) : type;
    this.type = this.type || type.get('string');
  },

  /**
   * 检查是否匹配
   **/
  testValue: function (value) {
    return this.type.regexp.test(value);
  }

});

const ArgumentCollection = new Class({
  $extends: Array
});

Argument.Collection = ArgumentCollection;

module.exports = Argument;
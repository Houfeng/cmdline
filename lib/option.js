const Class = require('cify').Class;
const utils = require('ntils');
const types = require('./type').types;

const OPTION_REGEXP = /^\-+([\s\S]*)/i;

const Option = new Class({

  constructor: function (names, type) {
    this.names = utils.isArray(names) ? names : [names];
    this.type = utils.isString(type) ? types.get(type) : type;
    this.type = this.type || types.get('string');
  },

  has: function (name) {
    return this.names.indexOf(name) > -1;
  },

  /**
   * 检查是否匹配
   **/
  testValue: function (value) {
    return this.type.regexp.test(value);
  }

});

Option.test = function (str) {
  return OPTION_REGEXP.test(str);
};

/**
 * 修整选项名
 **/
Option.trim = function (name) {
  if (!OPTION_REGEXP.test(name)) return name
  return OPTION_REGEXP.exec(name)[1];
};

const OptionCollection = new Class({
  $extends: Array,
  get: function (name) {
    return this.filter(function (item) {
      return item.has(name);
    })[0];
  }
});

Option.Collection = OptionCollection;

module.exports = Option;
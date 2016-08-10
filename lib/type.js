const Class = require('cify').Class;

const DEFAULT_CONVERT = function (value) {
  return value;
};

const DEFAULT_REGEXP = /[\S\s]*/i;

const Type = new Class({

  constructor: function (options) {
    options = options || Object.create(null);
    this.name = options.name;
    this.regexp = options.regexp || DEFAULT_REGEXP;
    this.default = options.default || '';
    this.covert = options.convert || DEFAULT_CONVERT;
    this.greed = options.greed || false;
  }

});

const TypeCollection = new Class({
  _extends: Array,
  get: function (name) {
    return this.filter(function (item) {
      return item.name == name;
    })[0];
  }
});

Type.types = new TypeCollection(
  new Type({
    name: 'string'
  }),
  new Type({
    name: 'string*',
    greed: true
  }),
  new Type({
    name: 'number',
    regexp: /^[0-9]*$/i,
    default: 0,
    convert: Number
  }),
  new Type({
    name: 'boolean',
    regexp: /^(1|0|true|false|yes|no){1}$/i,
    default: true,
    convert: function (str) {
      return ['1', 'true', 'yes'].indexOf(str) > -1;
    }
  }),
  new Type({
    name: 'switch',
    regexp: /^$/i,
    default: true
  })
);

Type.Type = Type;
Type.Collection = TypeCollection;

module.exports = Type;
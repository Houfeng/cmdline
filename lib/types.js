module.exports = {
  "string": {
    regexp: /[\S\s]*/i,
    default: '',
  },
  "string*": {
    regexp: /[\S\s]*/i,
    default: '',
    greed: true
  },
  "number": {
    regexp: /^[0-9]*$/i,
    default: 0,
    convert: Number
  },
  "boolean": {
    regexp: /^(1|0|true|false|yes|no){1}$/i,
    default: true,
    convert: function (str) {
      return ['1', 'true', 'yes'].indexOf(str) > -1;
    }
  },
  "switch": {
    regexp: /^$/i,
    default: true
  }
};
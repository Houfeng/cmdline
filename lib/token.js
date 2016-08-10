const Class = require('cify').Class;
const OPTION_REGEXP = /^\-+([\s\S]*)/i;

/**
 * 定义 token 类
 **/
const Token = new Class({

  /**
   * 构造一个 token
   **/
  constructor: function (value, type) {
    this.value = value;
    this.type = type || Token.TYPE_NORMAL;
  }

});

Token.TYPE_NORMAL = 0;
Token.TYPE_OPTION_NAME = 1;
Token.TYPE_OPTION_VALUE = 2;

/**
 * 解析 token
 * 1）以「-」开头的字符串视为「选项名」
 * 2）以「-」开头并且包含「＝」，将拆分为「选项名」和「选项值」
 * 3）其它的都视为「普通字符」
 **/
Token.parse = function (strArray) {
  var tokens = new Token.Collection();
  strArray.forEach(function (str) {
    if (!OPTION_REGEXP.test(str)) {
      return tokens.push(new Token(str, Token.TYPE_NORMAL));
    }
    var eqIndex = str.indexOf('=');
    if (eqIndex < 0) {
      return tokens.push(new Token(str, Token.TYPE_OPTION_NAME));
    }
    tokens.push(new Token(str.substring(0, eqIndex), Token.TYPE_OPTION_NAME));
    tokens.push(new Token(str.substring(eqIndex + 1), Token.TYPE_OPTION_VALUE));
  }, this);
  return tokens;
}

const TokenCollection = new Class({
  _extends: Array
});

Token.Collection = TokenCollection;

module.exports = Token;
const Class = require('cify').Class;
const utils = require('real-utils');

const OPTION_REGEXP = /^\-+(.*)/i;
const NOOP = function () { };

const Parser = new Class({

  /**
   * 构建函数
   **/
  constructor: function (originalArgv) {
    this.originalArgv = originalArgv;
    this._errorHandler = NOOP;
    this._handler = NOOP;
    this._options = {};
  },

  /**
   * 定义子命令处理函数
   **/
  command: function (names, hander) {
    hander = hander || NOOP;
    this._commands = this._commands || {};
    names = utils.isArray(names) ? names : [names];
    names.forEach(function (name) {
      this._commands[name.toString()] = {
        names: names,
        hander: hander || NOOP,
        regexp: name instanceof RegExp ? name : new RegExp(name)
      };
    }, this);
    return this;
  },

  /**
   * 定义全局处理函数
   **/
  handle: function (hander) {
    this._handler = hander || NOOP;
    return this;
  },

  /**
   * 选项
   **/
  option: function (names, settings) {
    this._options = this._options || {};
    settings = utils.isArray(settings) ? settings : [settings];
    names = utils.isArray(names) ? names : [names];
    names.forEach(function (name) {
      if (this._options[name]) {
        throw new Error('Repeated Option: ' + name);
      }
      settings.names = names;
      this._options[name] = settings;
    }, this);
    return this;
  },

  /**
   * 错误处理
   **/
  error: function (hander) {
    this._errorHandler = hander || NOOP;
    return this;
  },

  /**
   * 解析 tokens
   **/
  _parseTokens: function () {
    this._tokens = this._tokens || this.originalArgv;
    var tokens = []
    this._tokens.forEach(function (token) {
      tokens = tokens.concat(OPTION_REGEXP.test(token) ?
        token.split('=') : token);
    }, this);
    this._tokens = tokens;
  },

  /**
   * 解析 command
   **/
  _parseCommand: function () {
    if (!this._commands) return;
    this._command = this._tokens[0];
    this._commandHandler = utils.each(this._commands, function (name, item) {
      if (item.regexp.test(this._command)) return item.hander;
    }.bind(this));
    this._tokens = this._tokens.slice(1);
    if (!this._commandHandler) {
      this._commandHandler = NOOP;
      return new Error('Invalid command: ' + this._command);
    }
  },

  /**
   * 解析参数和选项
   **/
  _parseArgv: function () {
    this.argv = [];
    this.options = {};
    var index = 0, length = this._tokens.length;
    while (index < length) {
      var token = this._tokens[index];
      if (OPTION_REGEXP.test(token)) {
        var settings = this._options[token];
        if (!settings) {
          return new Error('Invalid option: ' + token);
        }
        var values = settings.map(function (setting) {
          index++;
          setting = setting || {};
          var nextToken = this._tokens[index];
          if (!OPTION_REGEXP.test(nextToken) &&
            setting.regexp &&
            setting.regexp.test(nextToken)) {
            return nextToken;
          } else {
            index--;
            return setting.default || true;
          }
        }, this);
        this.options[token] = values.length > 0 ? values : [true];
      } else {
        this.argv.push(token);
      }
      index++;
    }
  },

  /**
   * 解析选项
   **/
  _parseOptions: function () {
    var options = {};
    utils.each(this.options, function (_name, _values) {
      var name = OPTION_REGEXP.exec(_name)[1];
      var value = _values.length == 1 ? _values[0] : _values;;
      options[name] = value;
      this._options[_name].names.forEach(function (_alias) {
        var alias = OPTION_REGEXP.exec(_alias)[1];
        options[alias] = value;
      });
    }.bind(this));
    this.options = options;
  },

  /**
   * 生成可用于注入的 map
   **/
  _generateInjectMap: function () {
    var map = {};
    map['command'] = map['$command'] = this._command;
    map['self'] = map['$self'] = this;
    utils.each(this.argv, function (name, value) {
      map['$' + name] = value;
    }.bind(this));
    utils.copy(this.options, map);
    return map;
  },

  /**
   * 解析注入参数
   **/
  _parseInjectArguments: function (fn) {
    var valueMap = this._generateInjectMap();
    var argumentNames = this._parseFunctionArgumentNames(fn);
    return argumentNames.map(function (name) {
      return valueMap[name];
    }, this);
  },

  /**
   * 解析 function 的参数列表
   **/
  _parseFunctionArgumentNames: function (fn) {
    if (!fn) return [];
    var src = fn.toString();
    var parts = src.split(')')[0].split('=>')[0].split('(');
    return (parts[1] || parts[0]).split(',').map(function (name) {
      return name.trim();
    }).filter(function (name) {
      return name != 'function';
    });
  },

  /**
   * 调用一个处理函数
   **/
  _callHandler: function (fn) {
    fn.apply(this, this._parseInjectArguments(fn));
  },

  /**
   * 启动处理
   **/
  ready: function () {
    var err = utils.each([
      this._parseTokens,
      this._parseCommand,
      this._parseArgv,
      this._parseOptions
    ], function (i, fn) {
      return fn.call(this);
    }.bind(this));
    if (err) {
      this._errorHandler(err);
    } else {
      this._callHandler(this._handler);
      this._callHandler(this._commandHandler);
    }
    return this;
  }

});

module.exports = Parser;
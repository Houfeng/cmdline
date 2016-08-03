const Class = require('cify').Class;
const utils = require('real-utils');

const OPTION_REGEXP = /^\-+([\s\S]*)/i;
const COMMAND_REGEXP = /^[a-z0-9]+/i;
const NOOP = function () { };

const Parser = new Class({

  /**
   * 构建函数
   **/
  constructor: function (options) {
    options = options || {};
    this.originalArgv = options.argv || process.argv.slice(2);
    this._console = options.console || console;
    this._errorHandler = function (err) {
      this._console.error(err.message || err);
    }.bind(this);
    this._handlers = [];
    this._options = {};
  },

  /**
   * 定义子命令处理函数
   **/
  command: function (names, handler, _arguments) {
    if (!names) return this;
    handler = handler || NOOP;
    this._commands = this._commands || {};
    names = utils.isArray(names) ? names : [names];
    names.forEach(function (name) {
      this._commands[String(name)] = {
        names: names,
        regexp: name instanceof RegExp ? name : new RegExp(name)
      };
      this.handler({
        command: name,
        arguments: !!_arguments
      }, handler);
    }, this);
    return this;
  },

  /**
   * 定义全局处理函数
   **/
  handler: function (pattern, handler) {
    if (arguments.length == 1) {
      return this.handler(null, pattern);
    }
    pattern = pattern || {};
    if (utils.isString(pattern.command)) {
      pattern.command = new RegExp('^' + pattern.command + '$');
    }
    this._handlers.push({
      pattern: pattern,
      handler: handler
    });
    return this;
  },

  /**
   * 选项
   **/
  option: function (names, settings, handler) {
    if (!names) return this;
    this._options = this._options || {};
    settings = utils.isArray(settings) ? settings : [settings];
    names = utils.isArray(names) ? names : [names];
    names.forEach(function (name) {
      if (this._options[name]) {
        throw new Error('Repeated Option: ' + name);
      }
      settings.names = names;
      this._options[name] = settings;
      this.handler({
        options: [name]
      }, handler);
    }, this);
    return this;
  },

  /**
   * 错误处理
   **/
  error: function (handler) {
    this._errorHandler = handler || this._errorHandler || NOOP;
    return this;
  },

  /**
   * 发出一个错误
   **/
  _emitError: function (err) {
    this._errorHandler(err);
    return this;
  },

  /**
   * 配置控制台
   **/
  console: function (console) {
    this._console = console || this._console;
    return this;
  },

  /**
   * 添加「版本」选项
   **/
  version: function (version) {
    this.option(['-v', '--version'], null, function (self) {
      self._console.log(version || 'unknow');
    });
    return this;
  },

  /**
   * 添加「帮助」选项
   **/
  help: function (help) {
    this.option(['-h', '--help'], null, function (self) {
      self._console.log(help || 'unknow');
    });
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
   * 解析组合短参数
   **/
  _parseTokensForComboOptions: function () {
    var invalidOptions = [];
    this._tokens.forEach(function (token, index) {
      if (!OPTION_REGEXP.test(token)) return; //如果不是 option
      if (this._options[token]) return; //如果是一个明确存在的 option
      var shortOptions = token.replace(/\-/, '').split('').map(function (char) {
        return '-' + char;
      });
      var allExsits = !shortOptions.some(function (name) {
        return !this._options[name];
      }, this);
      if (!allExsits) {
        invalidOptions.push(token);
        return;
      }
      //将分解后的短参插入
      [].splice.apply(this._tokens, [index, 1].concat(shortOptions));
    }, this);
    return invalidOptions.length > 0 ?
      new Error('Invalid option: ' + invalidOptions.join(' ')) : null;
  },

  /**
   * 解析 command
   **/
  _parseCommand: function () {
    if (!this._commands) return;
    this._command = this._tokens[0];
    if (!this._command) return;
    if (!COMMAND_REGEXP.test(this._command)) {
      return new Error('Invalid command: ' + this._command);
    }
    var commandItem = utils.each(this._commands, function (name, item) {
      if (item.regexp.test(this._command)) return item;
    }.bind(this));
    this._tokens = this._tokens.slice(1);
    if (!commandItem) {
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
            return utils.isNull(setting.default) ? true : setting.default;
          }
        }, this);
        this.options[token] = values.length > 0 ? values : [true];
      } else {
        this.argv.push(token);
      }
      index++;
    }
    this.argc = this.argv.length;
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
    map['cmd'] = map['$cmd'] = this._command;
    map['self'] = map['$self'] = map['$this'] = this;
    map['argv'] = map['$argv'] = this.argv;
    map['argc'] = map['$argc'] = this.argc;
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
    if (!fn) return this;
    fn.apply(this, this._parseInjectArguments(fn));
    return this;
  },

  /**
   * 查找匹配的 handlers
   **/
  _findHandlers: function () {
    var handlers = this._handlers.filter(function (item) {
      var pattern = item.pattern;
      return (utils.isNull(pattern.argc) || pattern.argc == this.argc) &&
        (utils.isNull(pattern.options) || !pattern.options.some(function (name) {
          return !this.options[name.replace(/\-/, '')];
        }, this)) &&
        (utils.isNull(pattern.command) || pattern.command.test(this._command)) &&
        (!pattern.arguments || !this._parseInjectArguments(item.handler)
          .some(function (value) {
            return utils.isNull(value);
          }, this))
    }, this);
    return handlers.map(function (item) {
      return item.handler;
    });
  },

  /**
   * 启动处理
   **/
  ready: function () {
    var firstError = utils.each([
      this._parseTokens,
      this._parseTokensForComboOptions,
      this._parseCommand,
      this._parseArgv,
      this._parseOptions
    ], function (i, fn) {
      return fn.call(this);
    }.bind(this));
    if (firstError) {
      return this._emitError(firstError);
    }
    var handlers = this._findHandlers();
    if (handlers.length < 1) {
      return this._emitError(new Error('No processing'));
    }
    return this._callHandler(handlers[0]);
  }

});

module.exports = Parser;
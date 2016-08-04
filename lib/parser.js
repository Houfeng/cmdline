const Class = require('cify').Class;
const utils = require('ntils');
const types = require('./types');

//常量
const OPTION_REGEXP = /^\-+([\s\S]*)/i;
const COMMAND_REGEXP = /^[a-z0-9]+/i;
const NOOP_FUNCTION = function () { };
const TOKEN_TYPE_OPTION_VALUE = 'OPTION_VALUE';

/**
 * 定义命令行参数解析器
 **/
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
    this._types = utils.copy(types);
  },

  /**
   * 定义子命令处理函数
   **/
  command: function (names, fn, pattern) {
    if (!names) return this;
    if (utils.isFunction(pattern)) {
      fn = [pattern, pattern = fn][0];
    }
    if (!utils.isFunction(fn)) {
      fn = NOOP_FUNCTION;
    };
    this._commands = this._commands || {};
    names = utils.isArray(names) ? names : [names];
    names.forEach(function (name) {
      this._commands[String(name)] = {
        names: names,
        regexp: name instanceof RegExp ? name : new RegExp(name)
      };
      if (pattern === true) {
        pattern = { arguments: true };
      }
      pattern = (utils.isObject(pattern) ? pattern : {}) || {};
      pattern.command = name;
      this.handle(pattern, fn);
    }, this);
    return this;
  },

  /**
   * 定义全局处理函数
   **/
  handle: function (pattern, fn) {
    if (utils.isFunction(pattern)) {
      fn = [pattern, pattern = fn][0];
    }
    if (!utils.isFunction(fn)) return this;
    pattern = pattern || {};
    if (utils.isString(pattern.command)) {
      pattern.command = new RegExp('^' + pattern.command + '$');
    }
    this._handlers.push({
      pattern: pattern,
      handle: fn
    });
    return this;
  },

  /**
   * 选项
   **/
  option: function (names, settings, fn) {
    if (!names) return this;
    if (utils.isFunction(settings)) {
      fn = [settings, settings = fn][0];
    }
    if (!utils.isFunction(fn)) {
      fn = NOOP_FUNCTION;
    };
    this._options = this._options || {};
    settings = (utils.isArray(settings) ? settings : [settings]).map(function (setting) {
      setting = setting || {};
      var typeDefine = this._types[setting.type];
      if (!typeDefine) return setting;
      setting.regexp = setting.regexp || typeDefine.regexp;
      setting.default = setting.default || typeDefine.default;
      setting.convert = setting.convert || typeDefine.convert;
      return setting;
    }, this);
    names = utils.isArray(names) ? names : [names];
    names.forEach(function (name) {
      if (this._options[name]) {
        throw new Error('Repeated Option: ' + name);
      }
      settings.names = names;
      this._options[name] = settings;
      this.handle({
        options: [name]
      }, fn);
    }, this);
    return this;
  },

  /**
   * 错误处理
   **/
  error: function (fn) {
    this._errorHandler = fn || this._errorHandler || NOOP_FUNCTION;
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
   * 配置 Type
   **/
  type: function (name, define) {
    this._types[name] = define;
    return this;
  },

  /**
   * 添加「版本」选项
   **/
  version: function (version) {
    this.option(['-v', '--version'], {
      type: 'switch'
    }, function ($self) {
      $self._console.log(version || 'unknow');
      return false;
    });
    return this;
  },

  /**
   * 添加「帮助」选项
   **/
  help: function (help) {
    this.option(['-h', '--help'], {
      type: 'switch'
    }, function ($self) {
      $self._console.log(help || 'unknow');
      return false;
    });
    return this;
  },

  /**
   * 是否包含某一个参数或选项
   **/
  has: function (name) {
    return this._injectMap.hasOwnProperty(name);
  },

  /**
   * 获取一个参数或选项
   **/
  get: function (name) {
    name = OPTION_REGEXP.exec(name)[1];
    return this._injectMap[name];
  },

  /**
   * 更改一个参数或选项
   **/
  set: function (name, value) {
    name = OPTION_REGEXP.exec(name)[1];
    this._injectMap[name] = value;
    if (name[0] != '$') {
      this.option[name] = value;
    } else {
      this.argv[Number(name.substr(1))] = value;
      this._injectMap['$argv'] = this.argv;
      this._injectMap['argv'] = this.argv;
    }
    return this;
  },

  /**
   * 解析 tokens
   **/
  _parseTokens: function () {
    this._tokens = this._tokens || this.originalArgv;
    var tokens = []
    this._tokens.forEach(function (token) {
      var eqIndex = token.indexOf('=');
      if (!OPTION_REGEXP.test(token) || eqIndex < 0) {
        tokens.push(token);
      } else {
        tokens.push(token.substring(0, eqIndex));
        var optVal = new String(token.substring(eqIndex + 1));
        optVal.type = TOKEN_TYPE_OPTION_VALUE;
        tokens.push(optVal);
      }
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
      var shortOptions = OPTION_REGEXP.exec(token)[1].split('').map(function (char) {
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
    var command = this._tokens[0];
    if (utils.isNull(command) || OPTION_REGEXP.test(command)) return;
    this._command = command;
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
          var nextToken = this._tokens[index];
          if (!OPTION_REGEXP.test(nextToken) &&
            (!setting.regexp || setting.regexp.test(nextToken))) {
            var value = utils.isNull(nextToken) ?
              setting.default : nextToken.toString();
            return setting.convert ? setting.convert(value) : value;
          } else {
            index--;
            return setting.default;
          }
        }, this);
        this.options[token] = values;
      } else if (token.type != TOKEN_TYPE_OPTION_VALUE) {
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
      var value = _values.length == 1 ? _values[0] : _values;
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
    utils.each(this.argv, function (index, value) {
      map['$' + index] = value;
    }.bind(this));
    utils.each(this.options, function (name, value) {
      map[name] = value;
    }, this);
    this._injectMap = map;
  },

  /**
   * 解析注入参数
   **/
  _parseInjectArguments: function (fn) {
    var argumentNames = utils.getFunctionArgumentNames(fn);
    return argumentNames.map(function (name) {
      return this._injectMap[name];
    }, this);
  },

  /**
   * 调用一个处理函数
   **/
  _callHandler: function (handler) {
    if (!handler || !handler.handle) return this;
    return handler.handle.apply(this, this._parseInjectArguments(handler.handle));
  },

  /**
   * 查找匹配的 handlers
   **/
  _findHandlers: function () {
    var handlers = this._handlers.filter(function (item) {
      var pattern = item.pattern;
      return (utils.isNull(pattern.argc) || pattern.argc == this.argc) &&
        (utils.isNull(pattern.options) || !pattern.options.some(function (name) {
          return !this.options[OPTION_REGEXP.exec(name)[1]];
        }, this)) &&
        (utils.isNull(pattern.command) || pattern.command.test(this._command)) &&
        (!pattern.arguments || !utils.getFunctionArgumentNames(item.handle)
          .some(function (name) {
            return !this._injectMap.hasOwnProperty(name);
          }, this));
    }, this);
    return handlers;
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
      this._parseOptions,
      this._generateInjectMap
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
    utils.each(handlers, function (i, handler) {
      return this._callHandler(handler) === false || null;
    }.bind(this));
    return this;
  }

});

module.exports = Parser;
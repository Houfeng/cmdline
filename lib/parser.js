const Class = require('cify').Class;
const fs = require('fs');
const os = require('os');
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
    this._commands = this._commands || {};
    if (utils.isFunction(pattern)) {
      fn = [pattern, pattern = fn][0];
    }
    fn = utils.isFunction(fn) ? fn : NOOP_FUNCTION;
    pattern = (pattern === true ? { arguments: true } : pattern) || {};
    names = utils.isArray(names) ? names : [names];
    names.forEach(function (name) {
      //name 有可能是正则表达式，所以显式转换一下
      this._commands[String(name)] = {
        names: names,//声明关联的 commands
        regexp: name instanceof RegExp ? name : new RegExp('^' + name + '$')
      };
      //防止多个 command 之间影响「拷贝」pattern
      var _pattern = utils.copy(pattern);
      //为每个 command 指定 'command 匹配' 的 handle
      //但如果 pattern 还有其它规则，并 and 的关系生效
      _pattern.command = name;
      this.handle(_pattern, fn);
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
    if (!utils.isFunction(fn) || fn == NOOP_FUNCTION) {
      return this;
    }
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
  option: function (names, setting, fn) {
    if (!names) return this;
    this._options = this._options || {};
    if (utils.isFunction(setting)) {
      fn = [setting, setting = fn][0];
    }
    fn = utils.isFunction(fn) ? fn : NOOP_FUNCTION;
    //处理 setting 开始
    setting = (utils.isString(setting) ? { type: setting } : setting) || {};
    var typeDefine = this._types[setting.type];
    if (!typeDefine) return setting;
    utils.each(typeDefine, function (name, value) {
      setting[name] = setting[name] || value;
    }.bind(this));
    if (utils.isString(setting.command)) {
      setting.command = new RegExp('^' + setting.command + '$');
    }
    //处理 setting 结束
    names = utils.isArray(names) ? names : [names];
    names.forEach(function (name) {
      if (this._options[name]) throw new Error('Repeated Option: ' + name);
      //防止多个 options 之间影响「拷贝」setting
      var _setting = utils.copy(setting);
      _setting.names = names; //声明关联的 options
      this._options[name] = _setting;
      //为每个 option 添加 handle
      //option 的 handle 不能自行配置，只要出现包含的选项，就会执行
      var _pattern = utils.copy(setting);
      _pattern.options = [name];
      this.handle(_pattern, fn);
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
   * 字符串或文件内容
   **/
  _strOrFile: function (str) {
    if (utils.isNull(str)) return str;
    if (str[0] != '@') return str;
    try {
      return fs.readFileSync(str.substr(1), 'utf8');
    } catch (err) {
      return str;
    }
  },

  /**
   * 添加「版本」选项
   **/
  version: function (version) {
    this._version = this._strOrFile(version);
    this.option(['-v', '--version'], {
      type: 'switch',
      command: ''
    }, function ($self) {
      $self._console.log($self._version || 'unknow');
      return false;
    });
    return this;
  },

  /**
   * 添加「帮助」选项
   **/
  help: function (help) {
    this._help = this._strOrFile(help);
    this.option(['-h', '--help'], {
      type: 'switch',
      command: ''
    }, function ($self) {
      $self._console.log($self._help || 'unknow');
      return false;
    });
    return this;
  },

  /**
   * 修整选项名
   **/
  _trimOptionName: function (name) {
    if (!OPTION_REGEXP.test(name)) return name
    return OPTION_REGEXP.exec(name)[1];
  },

  /**
   * 是否包含某一个参数或选项
   **/
  has: function (name) {
    name = this._trimOptionName(name);
    if (utils.isNull(name)) return false;
    return this.params.hasOwnProperty(name);
  },

  /**
   * 获取一个参数或选项
   **/
  get: function (name) {
    if (!this.has(name)) return;
    return this.params[name];
  },

  /**
   * 更改一个参数或选项
   **/
  set: function (name, value) {
    name = this._trimOptionName(name);
    this.params[name] = value;
    if (name[0] != '$') {
      this.option[name] = value;
    } else {
      this.argv[Number(name.substr(1))] = value;
      this.params['$argv'] = this.argv;
      this.params['argv'] = this.argv;
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
   * 是否包含重复字符
   **/
  _hasRepeatChar: function (str) {
    if (utils.isNull(str)) return false;
    var array = str.split('');
    return utils.unique(array).length != array.length;
  },

  /**
   * 解析组合短参数
   **/
  _parseTokensForComboOptions: function () {
    this._tokens.forEach(function (token, index) {
      if (!OPTION_REGEXP.test(token)) return; //如果不是 option
      if (this._options[token]) return; //如果是一个明确存在的 option
      var trimedName = this._trimOptionName(token);
      if (trimedName.length < 2 || this._hasRepeatChar(trimedName)) return;
      var shortOptions = trimedName.split('').map(function (char) {
        return '-' + char;
      });
      var allExsits = !shortOptions.some(function (name) {
        return !this._options[name];
      }, this);
      if (!allExsits) return;
      //将分解后的短参插入
      [].splice.apply(this._tokens, [index, 1].concat(shortOptions));
    }, this);
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
    var invalidOptions = [], index = -1, len = this._tokens.length;
    while ((++index) < len) {
      var token = this._tokens[index];
      if (OPTION_REGEXP.test(token)) { //如果是一个 options
        index++;
        var setting = this._options[token];
        //如果「选项」不存在，或限定的 command 不匹配，添加到 invalidOptions 
        if (
          utils.isNull(setting) ||
          (setting.command && !setting.command.test(this._command || ''))
        ) {
          invalidOptions.push(token);
          continue;
        }
        //如果存在，则检查后边紧临的 token 是否符合「正则」这义的规则
        var nextToken = this._tokens[index];
        if (
          (!OPTION_REGEXP.test(nextToken) || setting.greed) &&
          (!setting.regexp || setting.regexp.test(nextToken))
        ) {
          var value = utils.isNull(nextToken) ? setting.default : nextToken.toString();
          this.options[token] = setting.convert ? setting.convert(value) : value;
        } else {
          //如果后边紧临的 token 不符合「正则」这义的规则，则回退 index 
          //并将「默认」值赋值给当前选项
          index--;
          this.options[token] = setting.default;
        }
      } else if (token.type != TOKEN_TYPE_OPTION_VALUE) {
        //如果不是 option，也不是「=」号后的「只能作为选项值」的 token
        //则放到 argv 数组中
        this.argv.push(token);
      }
    }
    //得到参数个数 argc
    this.argc = this.argv.length;
    //检果是否有无效的 option 并返回
    return invalidOptions.length > 0 ?
      new Error('Invalid option: ' + invalidOptions.join(',')) : null;
  },

  /**
   * 解析选项
   **/
  _parseOptions: function () {
    var options = {};
    utils.each(this.options, function (_name, _values) {
      var name = this._trimOptionName(_name);
      var value = _values.length == 1 ? _values[0] : _values;
      options[name] = value;
      this._options[_name].names.forEach(function (_alias) {
        var alias = this._trimOptionName(_alias);
        options[alias] = value;
      }, this);
    }.bind(this));
    this.options = options;
  },

  /**
   * 合并所有参数和选项及其它参数
   **/
  _mergeAllParams: function () {
    var params = {};
    params['command'] = params['$command'] = this._command;
    params['cmd'] = params['$cmd'] = this._command;
    params['self'] = params['$self'] = params['$this'] = this;
    params['argv'] = params['$argv'] = this.argv;
    params['argc'] = params['$argc'] = this.argc;
    utils.each(this.argv, function (index, value) {
      params['$' + index] = value;
    }.bind(this));
    utils.each(this.options, function (name, value) {
      params[name] = value;
    }.bind(this));
    this.params = params;
  },

  /**
   * 解析注入参数
   **/
  _parseInjectArguments: function (fn) {
    var argumentNames = utils.getFunctionArgumentNames(fn);
    return argumentNames.map(function (name) {
      return this.params[name];
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
          return !this.options[this._trimOptionName(name)];
        }, this)) &&
        (utils.isNull(pattern.command) || pattern.command.test(this._command)) &&
        (!pattern.arguments || !utils.getFunctionArgumentNames(item.handle)
          .some(function (name) {
            return !this.has(name);
          }, this));
    }, this);
    return handlers;
  },

  /**
   * 在没有找到 handlers 时执行
   **/
  noHandle: function () {
    if (this._help) return this._console.log(this._help);
    this._emitError(new Error('No processing'));
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
      this._mergeAllParams
    ], function (i, fn) {
      return fn.call(this);
    }.bind(this));
    //检查预处理并执行下一步
    if (firstError) return this._emitError(firstError);
    //查找 handles 并执行
    var handlers = this._findHandlers();
    if (handlers.length < 1) return this.noHandle();
    utils.each(handlers, function (i, handler) {
      return this._callHandler(handler) === false || null;
    }.bind(this));
    return this;
  }

});

module.exports = Parser;
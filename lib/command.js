const Class = require('cify').Class;
const fs = require('fs');
const os = require('os');
const path = require('path');
const EventEmitter = require('events');
const utils = require('ntils');
const Option = require('./option');
const Action = require('./action');
const Token = require('./token');
const Argument = require('./argument');

//常量
const COMMAND_REGEXP = /^[a-z0-9]+/i;
const NOOP_FUNCTION = function () { };

/**
 * 定义命令行参数解析器
 **/
const Command = new Class({
  $extends: EventEmitter,
  /**
   * 构建函数
   **/
  constructor: function (options) {
    options = options || {};
    this.names = utils.isArray(options.names) ?
      options.names : [options.names];
    this.parent = options.parent || this;
    this.root = this.parent.root || this;
    this._options = new Option.Collection();
    this._commands = new Command.Collection();
    this._actions = new Action.Collection();
    this._arguments = new Argument.Collection();
    this._console = this.parent._console || console;
    this._errorHandler = this.parent._errorHandler || function (err) {
      this._console.error(err.message || err);
    }.bind(this);
  },

  /**
   * 是否是 root
   **/
  isRoot: function () {
    return this.root == this;
  },

  /**
   * 定义子命令处理函数
   **/
  command: function (names) {
    var cmd = new Command({
      names: names,
      parent: this.parent
    });
    this._commands.push(cmd);
    return cmd;
  },

  /**
   * 定义动作处理函数
   **/
  action: function (handler, required) {
    this._actions.push(new Action(handler, required));
    return this;
  },

  /**
   * 选项
   **/
  option: function (names, type) {
    this._options.push(new Option(names, type));
    return this;
  },

  /**
   * 定义参数类型
   **/
  arguments: function () {
    var types = utils.isArray(arguments[0]) ?
      arguments[0] : arguments;
    this._arguments = new Argument.Collection(types.map(function (type) {
      return new Argument(type);
    }, this));
    return this;
  },

  /**
   * 错误处理
   **/
  error: function (handler) {
    this._errorHandler = handler || this._errorHandler;
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
   * 检查子命令并开始解析
   **/
  parse: function (argv) {
    if (!argv) {
      throw new Error('Invalid arguments: command.parse');
    }
    this._argv = argv.slice(1);
    this._name = path.basename(this._argv[0]);
    var subCommand = this._parseCommand();
    if (subCommand && subCommand instanceof Error) {
      return this._emitError(subCommand);
    } else if (subCommand) {
      return subCommand.parse(this._argv);
    }
    return this._parse();
  },

  /**
   * 开始解析
   **/
  _parse: function () {
    var firstError = utils.each([
      this._parseTokens,
      this._parseArgvAndOptions,
      this._covertOptions,
      this._mergeAllParams
    ], function (i, fn) {
      return fn.call(this);
    }.bind(this));
    //检查预处理并执行下一步
    if (firstError) return this._emitError(firstError);
    //查找 handles 并执行
    var handlers = this._findActions();
    if (handlers.length < 1) return this.noAction();
    utils.each(handlers, function (i, handler) {
      return this._callAction(handler) === false || null;
    }.bind(this));
    return this;
  },

  /**
   * 就续并开始执行
   **/
  ready: function () {
    this.root.parse(process.argv);
  },

  /**
   * 解析 Tokens, 目前主要处理组合短参数
   **/
  _parseTokens: function () {
    this._tokens = Token.parse(this._argv);
    this._tokens.forEach(function (token, index) {
      if (token.type !== Token.TYPE_OPTION_NAME) return; //如果不是 option
      if (this._options.get(token.value)) return; //如果是一个明确存在的 option
      var trimedName = Option.trim(token.value);
      if (trimedName.length < 2 || this._hasRepeatChar(trimedName)) return;
      var shortOptionNames = trimedName.split('').map(function (char) {
        return '-' + char;
      });
      var allExsits = !shortOptionNames.some(function (name) {
        return !this._options.get(name);
      }, this);
      if (!allExsits) return;
      //将分解后的短参插入
      [].splice.apply(this._tokens, [index, 1].concat(shortOptionNames.map(function (name) {
        return new Token(name, Token.TYPE_OPTION_NAME);
      })));
    }, this);
  },

  /**
   * 解析 command
   **/
  _parseCommand: function () {
    var subCommendName = this._argv[1];
    if (utils.isNull(subCommendName) ||
      this._commands.length < 1 ||
      Option.test(subCommendName)) {
      return;
    }
    if (!COMMAND_REGEXP.test(this.subCommendName)) {
      return new Error('Invalid command: ' + subCommendName);
    }
    var command = this._commands.get(subCommendName);
    if (!command) {
      return new Error('Invalid command: ' + subCommendName);
    }
    return command;
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
   * 解析参数和选项
   **/
  _parseArgvAndOptions: function () {
    this.argv = [], this.options = {};
    var index = 0, len = this._tokens.length;
    //从 index=1 开始
    while ((++index) < len) {
      var token = this._tokens[index];
      if (token.type === Token.TYPE_OPTION_NAME) { //如果是一个 options
        var option = this._options.get(token.value);
        //如果「选项」不存在，或限定的 command 不匹配，添加到 errArray 
        if (utils.isNull(option)) {
          return new Error('Invalid option: ' + token.value);
        }
        //如果存在，则检查后边紧临的 token 是否符合「正则」这义的规则
        var nextToken = this._tokens[++index];
        if (
          utils.isNull(nextToken) ||
          (nextToken.type === Token.TYPE_OPTION_NAME && !option.type.greed) ||
          !option.testValue(nextToken.value)
        ) {
          //如果后边紧临的 token 不符合「正则」这义的规则，则回退 index 
          //并将「默认」值赋值给当前选项
          index--;
          this.options[token.value] = option.type.default;
          continue;
        }
        this.options[token.value] = option.convert ?
          option.convert(nextToken.value) : nextToken.value;
      } else if (token.type !== Token.TYPE_OPTION_VALUE) {
        //如果不是 option，也不是「=」号后的「只能作为选项值」的 token
        //则放到 argv 数组中
        var argument = this._arguments[this.argv.length];
        if (argument && !argument.testValue(token.value)) {
          return new Error('Invalid Argument: ' + token.value);
        }
        this.argv.push(token.value);
      }
    }
    //得到参数个数 argc
    this.argc = this.argv.length;
  },

  /**
   * 转换选项结构
   **/
  _covertOptions: function () {
    var options = {};
    utils.each(this.options, function (_name, _value) {
      var name = Option.trim(_name);
      options[name] = _value;
      this._options.get(_name).names.forEach(function (_alias) {
        var alias = Option.trim(_alias);
        options[alias] = _value;
      }, this);
    }.bind(this));
    this.options = options;
  },

  /**
   * 合并所有参数和选项及其它参数
   **/
  _mergeAllParams: function () {
    var params = {};
    params['command'] = params['$command'] = this._name;
    params['cmd'] = params['$cmd'] = params['$0'] = this._name;
    params['self'] = params['$self'] = params['$this'] = this;
    params['argv'] = params['$argv'] = this.argv;
    params['argc'] = params['$argc'] = this.argc;
    utils.each(this.argv, function (index, value) {
      params['$' + (index + 1)] = value;
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
  _callAction: function (action) {
    if (!action || !action.handler) return this;
    return action.handler.apply(this, this._parseInjectArguments(action.handler));
  },

  /**
   * 查找匹配的 handlers
   **/
  _findActions: function () {
    var foundActions = this._actions.filter(function (action) {
      var required = null;
      if (action.required === false) {
        required = [];
      } else if (utils.isArray(action.required)) {
        required = action.required;
      } else {
        required = utils.getFunctionArgumentNames(action.handler);
      }
      return !required.some(function (name) {
        return !this.has(name);
      }, this);
    }, this);
    return foundActions;
  },

  /**
   * 在没有找到 handlers 时执行
   **/
  noAction: function () {
    if (this._help) return this._console.log(this._help);
    this._emitError(new Error('No processing'));
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
    this.option(['-v', '--version'], 'switch');
    this.action(function ($self, version) {
      $self._console.log($self._version || 'unknow');
      return false;
    }, true);
    return this;
  },

  /**
   * 添加「帮助」选项
   **/
  help: function (help) {
    this._help = this._strOrFile(help);
    this.option(['-h', '--help'], 'switch');
    this.action(function ($self, help) {
      $self._console.log($self._help || 'unknow');
      return false;
    }, true);
    return this;
  },

  /**
   * 是否包含某一个参数或选项
   **/
  has: function (name) {
    name = Option.trim(name);
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
    name = Option.trim(name);
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

});

const CommandCollection = new Class({
  $extends: Array,
  get: function (name) {
    return this.filter(function (item) {
      return item.names.some(function (item) {
        return (item == name) ||
          (item instanceof RegExp) && item.test(name);
      });
    })[0];
  }
});

Command.Collection = CommandCollection;

module.exports = Command;
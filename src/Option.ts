import { Type, builtInTypes } from "./Type";
import { isArray, isString } from "ntils";

const OPTION_REGEXP = /^\-+([\s\S]*)/i;

export class Option {
  public names: string[];
  public type: Type;
  constructor(names: string[] | string, type: Type | string) {
    this.names = isArray(names) ? names : [names];
    this.type = isString(type) ? builtInTypes.get(type) : type;
    this.type = this.type || builtInTypes.get("string");
  }

  has(name: string) {
    return this.names.indexOf(name) > -1;
  }

  /**
   * 检查是否匹配
   * @param value 检查的值
   */
  testValue(value: any) {
    return this.type.regexp.test(value);
  }

  convert: Function;

  static test(str: string) {
    return OPTION_REGEXP.test(str);
  }

  /**
   * 修整选项名
   * @param name 名称
   */
  static trim(name: string) {
    if (!OPTION_REGEXP.test(name)) return name;
    return OPTION_REGEXP.exec(name)[1];
  }
}

export class OptionList extends Array<Option> {
  get(name: string) {
    return this.find(item => item.has(name));
  }
}

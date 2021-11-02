import { Type, builtInTypes } from "./Type";

import { isString } from "ntils";

/**
 * 参数对象
 */
export class Argument {
  /**
   * 参数类型
   */
  public type: Type;

  /**
   * 构建一个参数对象
   * @param type 类型或内建类型名称
   */
  constructor(type: Type | string) {
    this.type = isString(type) ? builtInTypes.get(type) : type;
    this.type = this.type || builtInTypes.get("string");
  }

  /**
   * 检查是否匹配
   * @param value 检查的值
   */
  testValue(value: string) {
    return this.type.regexp.test(value);
  }
}

export class ArgumentList extends Array<Argument> {}

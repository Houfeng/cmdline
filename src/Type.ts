const DEFAULT_CONVERT = (value: any) => {
  return value;
};

const DEFAULT_REGEXP = /[\S\s]*/i;

/**
 * 类型
 */
export class Type {
  public name: string;
  public regexp: RegExp;
  public default: string;
  public greed: boolean;
  public covert: Function;

  constructor(public options: any) {
    options = options || {};
    this.name = options.name;
    this.regexp = options.regexp || DEFAULT_REGEXP;
    this.default = options.default || "";
    this.covert = options.convert || DEFAULT_CONVERT;
    this.greed = options.greed || false;
  }
}

/**
 * 类型集合
 */
export class TypeCollection extends Array<Type> {
  get(name: string) {
    return this.filter(item => {
      return item.name === name;
    })[0];
  }
}

/**
 * 内建类型
 */
export const builtInTypes = new TypeCollection(
  new Type({
    name: "string"
  }),
  new Type({
    name: "string*",
    greed: true
  }),
  new Type({
    name: "number",
    regexp: /^[0-9]*$/i,
    default: 0,
    convert: Number
  }),
  new Type({
    name: "boolean",
    regexp: /^(1|0|true|false|yes|no){1}$/i,
    default: true,
    convert(str: string) {
      return ["1", "true", "yes"].indexOf(str) > -1;
    }
  }),
  new Type({
    name: "switch",
    regexp: /^$/i,
    default: true
  })
);

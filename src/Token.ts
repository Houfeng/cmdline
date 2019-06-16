const OPTION_REGEXP = /^\-+([\s\S]*)/i;

/**
 * 定义 token 类
 */
export class Token {
  static TYPE_NORMAL = 0;
  static TYPE_OPTION_NAME = 1;
  static TYPE_OPTION_VALUE = 2;

  /**
   * 构造一个 token
   * @param value 值
   * @param type 类别
   */
  constructor(public value: any, public type: number) {
    this.value = value;
    this.type = type || Token.TYPE_NORMAL;
  }

  /**
   * 解析 token
   * - 以「-」开头的字符串视为「选项名」
   * - 以「-」开头并且包含「＝」，将拆分为「选项名」和「选项值」
   * - 其它的都视为「普通字符」
   * @param strArray 字符串列表
   */
  static parse(strArray: string[]) {
    let tokens = new TokenList();
    strArray.forEach(str => {
      if (!OPTION_REGEXP.test(str)) {
        return tokens.push(new Token(str, Token.TYPE_NORMAL));
      }
      let eqIndex = str.indexOf("=");
      if (eqIndex < 0) {
        return tokens.push(new Token(str, Token.TYPE_OPTION_NAME));
      }
      tokens.push(new Token(str.substring(0, eqIndex), Token.TYPE_OPTION_NAME));
      tokens.push(
        new Token(str.substring(eqIndex + 1), Token.TYPE_OPTION_VALUE)
      );
    });
    return tokens;
  }
}

export class TokenList extends Array<Token> {}

/**
 * 返回 false 将不再尝试匹配其它 action
 */
export type ActionHandler = (
  ...args: any[]
) => void | boolean | Promise<void | boolean>;

export type ActionRequried = string[] | boolean;

/**
 * 动作定义
 */
export class Action {
  constructor(
    public handler: ActionHandler,
    public requiredParams: ActionRequried
  ) {
    this.handler = handler;
    this.requiredParams = requiredParams;
  }
}

export class ActionList extends Array<Action> {}

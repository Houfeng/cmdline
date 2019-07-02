/**
 * Action 处理函数，
 * 返回 false 将不再尝试匹配其它 action
 */
export type ActionHandler = (
  ...args: any[]
) => void | boolean | Promise<void | boolean>;

/**
 * Action 依赖的参数
 */
export type ActionRequried = string[] | string | boolean;

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

/**
 * 动作列表
 */
export class ActionList extends Array<Action> {}

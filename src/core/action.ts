import { isFunction } from '../utils/is';
import { fillInPathParams } from './path';

export function parseAction(
  action
): { namespace: string; path: string; method: string } | undefined {
  // 1. validate `action.type` matches the "namespace.method@path" pattern
  if (!action || typeof action.type !== 'string') return;
  // const matched = (action.type as string).match(/^([^\/]*)((?:\/[^\/]+)*)\/([^\/]+)$/);
  const matched = (action.type as string).match(
    /^(?:([^\.@ ]+)\.){0,1}([^\.@ ]+){1}(?: ?@((?:\/[^\/]+)+|\/)\/?){0,1}$/
  );
  if (!matched) return;

  // 2. validate `path` and `namespace` match spec
  const [namespace, method, path] = matched.slice(1);
  return { namespace, path, method };
}

export function createActionType(namespace, method, path) {
  return `${namespace ? namespace + '.' : ''}${method}${path ? ' @' + path : ''}`;
}

function _withPathParams(fn) {
  if (!isFunction(fn)) return fn;
  return (params, ...args) => {
    const actionMsg = fn(...args);
    const parsed = parseAction(actionMsg);
    if (!parsed) throw Error("[redux-ergo] Action type is not compilant to redux-ergo's protocal");

    const effectivePath = fillInPathParams(parsed.path, params || {});
    const actionType = createActionType(parsed.namespace, parsed.method, effectivePath);
    actionMsg.type = actionType;
    return actionMsg;
  };
}

type IArgsOf<F> = F extends (...args: infer A) => infer R ? A : any;
type IReturnOf<F> = F extends (...args: infer A) => infer R ? R : any;

export function withPathParams<A extends any[], R>(
  action: (...args: A) => R
): (params: any, ...args: A) => R;
export function withPathParams<A>(
  actions: A
): {
  [M in keyof A]: (
    params: A extends { __params__: any } ? A['__params__'] : any,
    ...args: IArgsOf<A[M]>
  ) => IReturnOf<A[M]>
};
export function withPathParams(actions: any) {
  if (typeof actions === 'function') {
    return _withPathParams(actions);
  } else {
    const _actions = {};
    for (const method in actions) {
      _actions[method] = _withPathParams(actions[method]);
    }
    return _actions;
  }
}

import { getByPath, setByPath, fillInPathParams } from '../utils/path-helpers';
// import { isPlainObject } from '../utils/is';
import { IAction } from './transpile';

const isPathPattern = (path: string) => /\/\:[^\/]+/.test(path);

function parseAction(__nsp__, __path__, action): [boolean, string | null] {
  // 1. validate `action.type` matches the "namespace/path/method" pattern
  if (!action || typeof action.type !== 'string') return [false, null];
  const matched = (action.type as string).match(/^([^\/]*)((?:\/[^\/]+)*)\/([^\/]+)$/);
  if (!matched) return [false, null];

  // 2. validate `path` and `namespace` match spec
  let isOwnScope = false;
  const [namespace, path, method] = matched.slice(1);
  if (namespace === __nsp__ && path === __path__) isOwnScope = true;

  return [isOwnScope, method];
}

/* FIXME: temp disable derives
const DERIVED_SYMBOL = Symbol ? Symbol('__DERIVED_SYMBOL__') : '__DERIVED_SYMBOL__';
function applyDerives(target, derives) {
  if (isPlainObject(target) && isPlainObject(derives)) {
    if (target[DERIVED_SYMBOL]) return target;
    target = { ...target };
    Object.defineProperties(target, derives);
    Object.defineProperty(target, DERIVED_SYMBOL, {
      configurable: false,
      writable: false,
      enumerable: false,
      value: true
    });
  }
  return target;
}
*/

export const gatewayFactory = (
  __nsp__: string,
  __path__: string,
  workers: { [x: string]: Function },
  derives?: { [x: string]: PropertyDescriptor },
  initialState?: any
) => {
  const isStablePath = !isPathPattern(__path__);

  return (rootState: any, action: IAction) => {
    const [isOwnScope, method] = parseAction(__nsp__, __path__, action);

    const worker = isOwnScope && method !== null ? workers[method] : undefined;

    let effectivePath: any = null;

    if (isStablePath) {
      effectivePath = __path__;
    } else {
      if (isOwnScope) {
        const pathParams = (action.meta && action.meta.params) || undefined;
        try {
          effectivePath = fillInPathParams(__path__, pathParams);
        } catch (err) {
          console && console.warn && console.warn(err);
          effectivePath = null;
        }
      } else {
        effectivePath = null;
      }
    }

    // 1. if `effectivePath` is null, there is nothing we can do, not even provide the `initialState`.
    if (effectivePath === null) return rootState;
    const oldLocalState = getByPath(rootState, effectivePath);

    // 2. if we have `effectivePath`, but not `worker`, we can at least provide the `initialState`
    // equivalent to `reducer(state = initialState, action)`
    let localState = oldLocalState === undefined ? initialState : oldLocalState;

    // 3. best case, both `effectivePath` and `worker` exist.
    if (worker) localState = worker(localState, action);
    // const newLocalState = applyDerives(localState, derives);
    const newLocalState = localState;

    if (newLocalState === oldLocalState) {
      return rootState;
    } else {
      return setByPath(rootState, effectivePath, newLocalState);
    }
  };
};

import { getByPath, setByPath, fillInPathParams } from '../utils/path-helpers';
import { isPlainObject, isFunction } from '../utils/is';
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

function applyDerive(derive, target, rootState) {
  if (!derive) return target;

  let derivedPropsDesc;
  if (isPlainObject(derive)) derivedPropsDesc = derive;
  if (isFunction(derive)) {
    const derived = derive(target, rootState);
    if (derived && isPlainObject(derived)) {
      derivedPropsDesc = Object.keys(derived).reduce(
        (descs, key) => {
          if (target && target.hasOwnProperty && target.hasOwnProperty(key)) return descs;
          descs[key] = {
            configurable: true,
            enumerable: false,
            writable: false,
            value: derived[key]
          };
          return descs;
        },
        {} as PropertyDescriptorMap
      );
    }
  }

  try {
    return Object.defineProperties(target, derivedPropsDesc);
  } catch (err) {
    return target;
  }
}

export const gatewayFactory = (
  __nsp__: string,
  __path__: string,
  workers: { [x: string]: Function },
  derive?: { [x: string]: PropertyDescriptor },
  defaultState?: any
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

    // 1. if `effectivePath` is null, there is nothing we can do, not even provide the `defaultState`.
    if (effectivePath === null) return rootState;
    const oldLocalState = getByPath(rootState, effectivePath);

    // 2. if we have `effectivePath`, but not `worker`, we can at least provide the `defaultState`
    // equivalent to `reducer(state = defaultState, action)`
    const localState = oldLocalState === undefined ? defaultState : oldLocalState;

    // 3. best case, both `effectivePath` and `worker` exist.
    const newLocalState = worker ? worker(localState, action) : localState;

    if (newLocalState === oldLocalState) {
      return rootState;
    } else {
      rootState = setByPath(rootState, effectivePath, newLocalState);
      applyDerive(derive, newLocalState, rootState);
      return rootState;
    }
  };
};

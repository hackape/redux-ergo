import { isFunction, isPlainObject } from '../utils/is';
import { hasPathPattern } from './path';
import { invariant } from '../utils/invariant';
import { reducerFactory } from './reducerFactory';
import { withPathParams, createActionType } from './action';

type IWorkers<S> = {
  [x: string]: (state: S extends {} ? any : S, ...args: any[]) => any;
};

export type IAction = {
  type: string;
  meta?: {
    params?: { [x: string]: string | number };
    finalize?: boolean;
  };
  payload?: any;
  error?: boolean;
};

type MethodProps<T> = ({ [K in keyof T]: T[K] extends Function ? K : never })[keyof T];
type ActionCreator<T> = T extends (s: any, ...args: infer A) => any ? (...args: A) => IAction : T;
type ActionCreator1<T> = T extends (...args: infer A) => any ? (...args: A) => IAction : T;

interface ISpecObject<S, P, R, E> {
  path?: string;
  pathParams?: P;
  namespace?: string;
  defaultState?: S;
  reducers: R;
}

interface ISpecClass<S, P, R> {
  new (): R;
  path?: string;
  pathParams?: P;
  namespace?: string;
  defaultState?: S;
}

type IOverride<P, S> = {
  path?: string;
  namespace?: string;
  pathParams?: P;
  defaultState?: S;
};

export function transpile<S, P, R extends IWorkers<S>, E extends IWorkers<S>>(
  spec: ISpecObject<S, P, R, E>
): {
  actions: {
    [K in keyof (E extends undefined ? R : R & E)]: P extends {}
      ? ActionCreator<(E extends undefined ? R : R & E)[K]>
      : (params: P) => ActionCreator<(E extends undefined ? R : R & E)[K]>
  };
  reducer: (rootState: any, action: IAction) => any;
};
export function transpile<S, P, R extends IWorkers<S>, E extends IWorkers<S>>(
  spec: ISpecObject<any, any, R, E>,
  override: IOverride<P, S>
): {
  actions: {
    [K in keyof (E extends undefined ? R : R & E)]: P extends {}
      ? ActionCreator<(E extends undefined ? R : R & E)[K]>
      : (params: P) => ActionCreator<(E extends undefined ? R : R & E)[K]>
  };
  reducer: (rootState: any, action: IAction) => any;
};

export function transpile<S, P, R>(
  spec: ISpecClass<S, P, R>
): {
  actions: {
    [K in MethodProps<R>]: P extends {} ? ActionCreator1<R[K]> : (params: P) => ActionCreator1<R[K]>
  };
  reducer: (rootState: any, action: IAction) => any;
};
export function transpile<S, P, R>(
  spec: ISpecClass<any, any, R>,
  override: IOverride<P, S>
): {
  spec: typeof spec;
  actions: {
    [K in MethodProps<R>]: P extends {} ? ActionCreator1<R[K]> : (params: P) => ActionCreator1<R[K]>
  };
  reducer: (rootState: any, action: IAction) => any;
};

export function transpile(spec: any, override: any = {}) {
  let mode: 'FP' | 'OO';

  const specNsp: string = override.namespace || spec.namespace || '';
  const specPath: string = override.path || spec.path || '/';
  const specPathParams: { [k: string]: any } = override.pathParams || spec.pathParams;

  // preliminary validation
  invariant(!specNsp.includes('/'), '[redux-ergo] `namespace` must not contain "/"');
  invariant(
    typeof specPath === 'string' && specPath.startsWith('/'),
    '[redux-ergo] `path` must be a string that starts with "/", got "%s".',
    specPath
  );

  invariant(
    specPathParams === undefined || isPlainObject(specPathParams),
    '[redux-ergo] `pathParams` must be undefined or plain object'
  );

  const __nsp__ = specNsp;
  const __path__ = specPath.replace(/\/{1,}$/, ''); // trim trailing slashes
  const __params__ = specPathParams;

  // preliminary validation passed, double check `path` and `pathParams`
  if (hasPathPattern(__path__)) {
    const paramKeys = __path__.split('/').filter(pathComp => pathComp[0] === ':');
    if (__params__ === undefined) {
      invariant(
        false,
        '[redux-ergo] Your `path` has path param patterns ' +
          paramKeys.map(key => `"${key}"`).join(', ') +
          ' , but you did not specify `pathParams`.'
      );
    } else {
      const missedOutKeys = paramKeys.filter(key => !__params__.hasOwnProperty(key.slice(1)));
      if (missedOutKeys.length) {
        invariant(
          false,
          '[redux-ergo] The following path params are not declared in the `pathParams` object, please double check: ' +
            missedOutKeys.map(key => `"${key}"`).join(', ')
        );
      }
    }
  }

  const defaultState = override.defaultState || spec.defaultState;

  let specMethods = {};
  let specDerive;

  let actions = {};
  const methods = {};

  let proto;
  if (isFunction(spec)) {
    mode = 'OO';
    proto = spec.prototype || {};
    const protoKey = Object.getOwnPropertyNames(proto);
    for (const key of protoKey) {
      if (key === 'constructor') continue;
      const desc = Object.getOwnPropertyDescriptor(proto, key) || {};

      if (isFunction(desc.value)) {
        specMethods[key] = desc.value;
      } else if (isFunction(desc.get)) {
        if (!specDerive) specDerive = {};
        specDerive[key] = desc;
      }
    }
  } else {
    mode = 'FP';
    specMethods = spec.reducers;
    specDerive = spec.derive;
    proto = { ...specMethods };
  }

  for (const methodName in specMethods) {
    actions[methodName] = (...args) => {
      return {
        type: createActionType(__nsp__, methodName, __path__),
        payload: args
      };
    };

    methods[methodName] = specMethods[methodName];
  }

  if (__params__) {
    actions = withPathParams(actions);
  }

  const reducer = reducerFactory({
    __nsp__,
    __path__,
    __params__,
    mode,
    methods,
    proto,
    derive: specDerive,
    defaultState
  });

  return {
    actions,
    reducer
  };
}

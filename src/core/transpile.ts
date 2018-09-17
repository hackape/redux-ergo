import { isFunction } from '../utils/is';
import { isEffect } from './effect';
import { workerFactory, IWorkers } from './worker';
import { gatewayFactory } from './gateway';

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
  effects?: E;
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
  effector: (rootState: any, action: IAction) => any;
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
  effector: (rootState: any, action: IAction) => any;
};

export function transpile<S, P, R>(
  spec: ISpecClass<S, P, R>
): {
  actions: {
    [K in MethodProps<R>]: P extends {} ? ActionCreator1<R[K]> : (params: P) => ActionCreator1<R[K]>
  };
  reducer: (rootState: any, action: IAction) => any;
  effector: (rootState: any, action: IAction) => any;
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
  effector: (rootState: any, action: IAction) => any;
};

export function transpile(spec: any, override?: any) {
  let mode: 'FP' | 'OO';
  if (!override) override = {};

  const __path__ = override.path || spec.path || '';
  const __nsp__ = override.namespace || spec.namespace || '';
  const __params__ = override.pathParams || spec.pathParams;

  const defaultState = override.defaultState || spec.defaultState;

  let specReducers = {};
  let specEffects = {};
  let specDerive;

  const actions = {};
  const reducers = {};
  const effectors = {};

  let proto;
  if (isFunction(spec)) {
    mode = 'OO';
    proto = spec.prototype || {};
    const protoKey = Object.getOwnPropertyNames(proto);
    for (const key of protoKey) {
      if (key === 'constructor') continue;
      const desc = Object.getOwnPropertyDescriptor(proto, key) || {};

      if (isFunction(desc.value)) {
        if (isEffect(desc.value)) {
          specEffects[key] = desc.value;
        } else {
          specReducers[key] = desc.value;
        }
      } else if (isFunction(desc.get)) {
        if (!specDerive) specDerive = {};
        specDerive[key] = desc;
      }
    }
  } else {
    mode = 'FP';
    specReducers = spec.reducers;
    specEffects = spec.effects;
    specDerive = spec.derive;
    proto = { ...specReducers, ...specEffects };
  }

  for (const methodName in specReducers) {
    if (__params__) {
      actions[methodName] = (params, ...args) => ({
        type: `${__nsp__}${__path__}/${methodName}`,
        meta: { params },
        payload: args
      });
    } else {
      actions[methodName] = (...args) => ({
        type: `${__nsp__}${__path__}/${methodName}`,
        payload: args
      });
    }

    reducers[methodName] = workerFactory(mode, proto, methodName);
  }

  for (const methodName in specEffects) {
    if (__params__) {
      actions[methodName] = (params, ...args) => ({
        type: `${__nsp__}${__path__}/${methodName}`,
        meta: { params, ergoEffect: true },
        payload: args
      });
    } else {
      actions[methodName] = (...args) => ({
        type: `${__nsp__}${__path__}/${methodName}`,
        meta: { ergoEffect: true },
        payload: args
      });
    }

    effectors[methodName] = workerFactory(mode, proto, methodName);
    reducers[methodName] = (prevState: any, action: IAction) => {
      if (action.meta && action.meta.finalize) return action.payload;
      return prevState;
    };
  }

  return {
    actions,
    effector: gatewayFactory(__nsp__, __path__, effectors, specDerive, defaultState),
    reducer: gatewayFactory(__nsp__, __path__, reducers, specDerive, defaultState)
  };
}

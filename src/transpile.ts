import { isEffect } from './effect';
import { isFunction } from './utils/is';
import { workerFactory } from './worker';
import { gatewayFactory } from './gateway';

export function transpile<S, P, R extends Workers<S>, E extends Workers<S>>(
  spec: ISpecObject<S, P, R, E>,
  path?: string,
  namespace?: string
): {
  bindActions: (
    params?: P extends {} ? any : P
  ) => {
    [K in keyof (E extends undefined ? R : R & E)]: ActionCreator1<
      (E extends undefined ? R : R & E)[K]
    >
  };

  actions: {
    [K in keyof (E extends undefined ? R : R & E)]: ActionCreator1<
      (E extends undefined ? R : R & E)[K]
    >
  };
  reducer: (rootState: any, action: IAction) => any;
  effector: (rootState: any, action: IAction) => any;
};

export function transpile<S, P, R>(
  spec: ISpecClass<S, P, R>,
  path?: string,
  namespace?: string
): {
  bindActions: (params?: P extends {} ? any : P) => { [K in MethodProps<R>]: ActionCreator<R[K]> };
  actions: { [K in MethodProps<R>]: ActionCreator<R[K]> };
  reducer: (rootState: any, action: IAction) => any;
  effector: (rootState: any, action: IAction) => any;
};

export function transpile(spec: any, path?: string, namespace?: string) {
  let mode: 'FP' | 'OO';

  const __path__ = path || spec.path || '';
  const __nsp__ = namespace || spec.namespace || '';

  let specReducers = {};
  let specEffects = {};
  let specDerives = {};

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
        specDerives[key] = desc;
      }
    }
  } else {
    mode = 'FP';
    specReducers = spec.reducers;
    specEffects = spec.effects;
    proto = { ...specReducers, ...specEffects };
  }

  for (const methodName in specReducers) {
    actions[methodName] = (...args) => ({
      type: `${__nsp__}${__path__}/${methodName}`,
      payload: args
    });

    reducers[methodName] = workerFactory(mode, proto, methodName);
  }

  for (const methodName in specEffects) {
    actions[methodName] = (...args) => ({
      type: `${__nsp__}${__path__}/${methodName}`,
      meta: { ergoEffect: true },
      payload: args
    });

    effectors[methodName] = workerFactory(mode, proto, methodName);
    reducers[methodName] = (prevState: any, action: IAction) => {
      if (action.meta && action.meta.finalize) return action.payload;
    };
  }

  return {
    actions,
    effector: gatewayFactory(__nsp__, __path__, effectors),
    reducer: gatewayFactory(__nsp__, __path__, reducers, specDerives)
  };
}

export default transpile;

const model = transpile({
  reducers: {
    me(state, yolo: number) {}
  }
});

model.bindActions;

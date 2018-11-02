import { asMutable, getValue } from 'as-mutable';
import { isPlainObject, isFunction, isIterator } from '../utils/is';
import { withPathParams, createActionType } from './action';
import { reducerFactory } from './reducerFactory';

export type IAction = {
  type: string;
  meta?: any;
  payload?: any;
  error?: boolean;
};

// interface IConfigObject<S, P, R, E> {
//   namespace?: string;
//   path?: string;
//   pathParams?: P;
//   defaultState?: S;
//   methods: R;
// }

// interface IService {
//   namespace?: string;
//   path?: string;
//   pathParams?: any;
//   reducer: any;
//   actions: any;
// }

function getPropValueFrom(targets: any[], prop: string, defaultValue?: any) {
  const value = targets.reduce(
    (val, target) => (val === undefined && prop in target ? target[prop] : val),
    undefined
  );
  return value === undefined ? defaultValue : value;
}

// for OOP mode
const getContextFactory = proto => (state, path, { stateCache }) => {
  // get current state from cache
  if (stateCache && stateCache.has && stateCache.has(path)) {
    state = stateCache.get(path);
  }
  const self = {
    // private API
    __mutableState__: undefined,
    __getState__() {
      return getValue(this.__mutableState__);
    },
    // public API
    get state() {
      return this.__mutableState__;
    },
    setState(partialState) {
      Object.assign(this.__mutableState__, partialState);
    }
  };

  (self as any).__proto__ = proto;
  // when invoke `getContext(state)`, initialize `__mutableState__`
  self.__mutableState__ = asMutable(state);
  // cache current state
  if (stateCache && stateCache.has && !stateCache.has(path)) {
    stateCache.set(path, self.__mutableState__);
  }
  return self;
};

function produceDeriveFuncFromGetters(getters: any) {
  let derive;
  const getterKeys = Object.keys(getters);
  if (getterKeys.length) {
    derive = function(state) {
      if (isPlainObject(state)) {
        const draftState = { ...state };
        Object.defineProperties(draftState, getters);
        getterKeys.forEach(key => {
          const value = draftState[key];
          Object.defineProperty(state, 'key', { value, writable: true });
        });
        return state;
      } else {
        return state;
      }
    };
  }
  return derive;
}

export function createService(config: any, override: any = {}) {
  const nsp: string = getPropValueFrom([override, config], 'namespace', '');
  const path: string = getPropValueFrom([override, config], 'path', '').replace(/\/{1,}$/, ''); // trim trailing slashes
  const params: { [k: string]: any } = getPropValueFrom([override, config], 'pathParams');
  const defaultState = getPropValueFrom([override, config], 'defaultState');

  // TODO: some validations on config props

  const methods = {};
  let actions = {};
  let derive: Function;
  let getContext: Function;

  // assign `methods` and `derive`
  if (isFunction(config)) {
    const proto = config.prototype || {};
    getContext = getContextFactory(proto);
    const getters = {};
    Object.getOwnPropertyNames(proto).forEach(key => {
      if (key === 'constructor') return;
      const desc = Object.getOwnPropertyDescriptor(proto, key) || {};
      if (isFunction(desc.value)) {
        const method = desc.value;
        // convert OOP method signature to standard reducer signature
        methods[key] = function(state, action) {
          const ret = method.call(this, ...action.payload);
          if (isIterator(ret)) return ret;
          return this.__getState__();
        };
      } else if (desc.get) {
        getters[key] = desc;
      }
    });
    derive = produceDeriveFuncFromGetters(getters);
  } else {
    // mode = 'FP';
    const configMethods = { ...config.methods };
    getContext = () => ({ ...configMethods });
    Object.keys(configMethods).forEach(key => {
      const method = configMethods[key];
      // convert FP method signature to standard reducer signature
      methods[key] = function(state, action) {
        return method.call(this, state, ...action.payload);
      };
    });
    derive = config.derive;
  }

  // assign `actions`
  for (const methodName in methods) {
    actions[methodName] = (...args) => {
      return {
        type: createActionType(nsp, methodName, path),
        payload: args
      };
    };
  }

  if (params) {
    actions = withPathParams(actions);
  }

  const reducer = reducerFactory({
    nsp,
    path,
    params,
    methods,
    getContext,
    derive,
    defaultState
  });

  // extra prop to inform gateway about self path
  if (params) {
    (reducer as any).params = params;
  } else {
    (reducer as any).path = path;
  }

  Object.assign(reducer, { asService: true, reducer, actions });

  return reducer;
}

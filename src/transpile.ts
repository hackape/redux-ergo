import { isFunction } from './utils/is';
import { mutable, getValue } from './utils/im-mutable';
import { getByPath, setByPath, fillInPathParams } from './utils/path-helpers';
import { isEffect } from './effectDecorator';
import { IAction, dispatch } from './middleware';

const isPathPattern = (path: string) => /\/\:[^\/]+/.test(path);

const getMutableStateWithProto = (plainStateObject, proto) => {
  const oldProto = plainStateObject.__proto__;
  plainStateObject.__proto__ = proto;
  const mutableState = mutable(plainStateObject);
  plainStateObject.__proto__ = oldProto;
  return mutableState;
};

// action type pattern is "namespace/path/method"
const processActionType = action => {
  if (!action || typeof action.type !== 'string') return null;
  const matched = action.type.match(/^([^\/]*)((?:\/[^\/]+)*)\/([^\/]+)$/);
  if (!matched) return null;
  const [type, namespace, path, method] = matched;
  return { type, namespace, path, method };
};

const WorkerFactory = (proto, methodName) => (prevState: any, action: IAction) => {
  // if finalize, simply return finalized state
  if (action.meta && action.meta.finalize) return action.payload;

  // save action.type and action.meta for later use
  const actionType = action.type;
  const actionMeta = action.meta && action.meta.params ? { params: { ...action.meta.params } } : {};

  // actually call the fn()
  const mutableState = getMutableStateWithProto(prevState, proto);
  const retValue = proto[methodName].apply(mutableState, action.payload);

  if (retValue instanceof Promise) {
    retValue.then(value => {
      const nextState = getValue(mutableState);

      dispatch({
        type: actionType,
        meta: { ...actionMeta, finalize: true },
        payload: nextState
      });
    });

    return prevState;
  } else {
    const nextState = getValue(mutableState);
    return nextState;
  }
};

const GatewayFactory = (__nsp__, __path__, workers) => (rootState: any, action: IAction) => {
  const actionInfo = processActionType(action);
  if (!actionInfo) return rootState;
  const { namespace, path, method } = actionInfo;
  if (namespace !== __nsp__ || path !== __path__) return rootState;

  const worker = workers[method];
  if (!worker) return rootState;

  let effectivePath = path;
  if (isPathPattern(__path__)) {
    const pathParams = (action.meta && action.meta.params) || {};
    effectivePath = fillInPathParams(path, pathParams);
  }
  if (effectivePath === null) return rootState;

  const localState = getByPath(rootState, effectivePath);
  const newLocalState = worker(localState, action);
  if (newLocalState === localState) return rootState;
  return setByPath(rootState, effectivePath, newLocalState);
};

export function transpile(spec, path?, namespace?) {
  // tslint:disable-next-line
  const __path__ = path || spec.path || '';
  const __nsp__ = namespace || spec.namespace || '';

  let proto = spec.prototype || {};
  let protoKey = Object.getOwnPropertyNames(proto);

  const getActions = (pathParams?: { [x: string]: string | number }) => {
    if (!isPathPattern(__path__)) return { ...actions };

    const bindedActions = {};
    for (const methodName in actions) {
      bindedActions[methodName] = (...args) => {
        return {
          type: `${__nsp__}${__path__}/${methodName}`,
          meta: { params: pathParams },
          payload: args
        };
      };
    }
    return bindedActions;
  };

  const actions = {};
  const reducers = {};
  const effectors = {};

  for (const key of protoKey) {
    // do not touch contructor
    if (key === 'constructor') continue;

    // get vanilla descriptor
    const desc = Object.getOwnPropertyDescriptor(proto, key) || {};

    // case 1: is method
    if (isFunction(desc.value)) {
      const methodName = key;
      const fn = desc.value;
      if (isEffect(fn)) {
        actions[methodName] = (...args) => {
          return {
            type: `${__nsp__}${__path__}/${methodName}`,
            meta: { ergoEffect: true },
            payload: args
          };
        };

        effectors[methodName] = WorkerFactory(proto, methodName);
        reducers[methodName] = (prevState, action: IAction) => {
          if (action.meta && action.meta.finalize) return action.payload;
        };
      } else {
        actions[methodName] = (...args) => {
          return {
            type: `${__nsp__}${__path__}/${methodName}`,
            payload: args
          };
        };

        reducers[methodName] = WorkerFactory(proto, methodName);
      }
    } else if (isFunction(desc.get)) {
    }
  }

  return {
    getActions,
    effector: GatewayFactory(__nsp__, __path__, effectors),
    reducer: GatewayFactory(__nsp__, __path__, reducers)
  };
}

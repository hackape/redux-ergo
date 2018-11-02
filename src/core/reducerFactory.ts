'use strict';

import { isFunction, isIterator } from '../utils/is';
import { parseAction } from './action';
import { activateStore, deactivateStore } from './storeTracker';
import { IAction } from './createService';

const memoizedApplyDeriveFactory = () => {
  let _target = undefined;
  return function applyDerive(derive, target) {
    if (target === _target) return target;

    if (isFunction(derive)) {
      const derived = derive(target);
      _target = derived;
      return derived;
    } else {
      return target;
    }
  };
};

type IGatewayReducerFactoryOptions = {
  nsp: string;
  path: string;
  params: undefined | any;
  methods: { [x: string]: Function };
  getContext: any;
  derive?: any;
  defaultState?: any;
};

type IRuntimeEnv = {
  effectivePath: string;
  namespace: string;
  methodName: string;
};

const call = (target, ...args) => {
  if (typeof target === 'function') target = [null, target];
  const [context, fn] = target;
  return fn.apply(context, args);
};

export const reducerFactory = ({
  nsp,
  path,
  params,
  methods,
  getContext,
  derive,
  defaultState
}: IGatewayReducerFactoryOptions) => {
  const memoizedApplyDerive = memoizedApplyDeriveFactory();
  const reducer = (state: any, action: IAction, env: IRuntimeEnv) => {
    // see if we hold a method that match current action
    const { methodName, namespace, effectivePath } = env;
    const method = methods[methodName];
    const shouldBypass = namespace !== nsp || !isFunction(method);
    if (shouldBypass) return state;

    // if finalize, simply return finalized state
    if (action.meta && action.meta.finalize) return action.payload;

    const context = getContext(state, effectivePath, env);
    return call([context, method], state, action);
  };

  const facadeReducer = (state: any = defaultState, action: IAction, store?: any) => {
    if (store) activateStore(store);

    // parse action, prepare metadata
    const parsed = parseAction(action) || {};
    const { namespace, method: methodName, path: actionPath } = parsed as any;
    const effectivePath = params ? path : actionPath;
    const runtimeEnv = { ...store, effectivePath, namespace, methodName };

    // invoke the working reducer
    const nextState = reducer(state, action, runtimeEnv);

    // invoke done, reset env
    if (store) deactivateStore(store);

    if (isIterator(nextState)) {
      // this is an effect, just return it to service gateway to run it.
      return nextState;
    } else {
      // plain object state, apply the derive;
      return derive ? memoizedApplyDerive(derive, nextState) : nextState;
    }
  };

  return facadeReducer;
};

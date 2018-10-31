// import { isGenerator, isPromise } from '../utils/is';
import { getValue } from 'as-mutable';
import { getByPath } from './path';
import { finalizeActionFactory } from './action';
import { TaskScheduler } from './task';

const setStateSymbol = Symbol('shouldUpdateState');
export const setState = (value: any, force: boolean = false) => ({
  [setStateSymbol]: true,
  value,
  force
});

const shouldUpdateState = (target: any) => Boolean(target && target[setStateSymbol]);

let storeManager;
class StoreManager {
  storesMap: any;
  activeStore: any;
  constructor() {
    // singleton
    if (storeManager) return storeManager;
    this.storesMap = WeakMap ? new WeakMap() : new Map();
  }

  registerStore(store) {
    this.storesMap.set(store, store);
  }
}
storeManager = new StoreManager();

export const getState = (path: string | { toString: () => string } = '') => {
  const store = storeManager.activeStore;
  if (!store) throw Error('[redux-ergo] You must apply store enhancer the first.');

  const currentState = store.getState() as any;
  if (!path) return currentState;
  return getByPath(currentState, String(path));
};

export function createEnhancer() {
  return next => (reducer, initialState, enhancer) => {
    const taskScheduler = new TaskScheduler();

    const liftReducer = reducer => {
      // only handle reducer with ergo's symbolic prop
      if (!reducer.__ergo__) return reducer;

      return (state, action) => {
        return reducer(state, action, taskScheduler);
      };
    };

    const store = next(liftReducer(reducer), initialState, enhancer);
    storeManager.registerStore(store);

    const replaceReducer = reducer => {
      return store.replaceReducer(liftReducer(reducer));
    };

    const onYieldedFactory = action => iter => {
      if (shouldUpdateState(iter.value)) {
        const finalize = finalizeActionFactory(action);

        const stateDelta = iter.value;
        let nextState = getValue(stateDelta.value);
        store.dispatch(finalize(nextState));

        /* TODO: implement `setState()` as partial update */
        // const parsed = parseAction(action)!;
        // const { path } = parsed;
        // if (stateDelta.force) {
        //   store.dispatch(finalize(nextState));
        // } else {
        //   const localState = getState(path)
        //   localState
        //   store.dispatch(finalize(stateValue));
        // }
      }
    };

    const dispatch = action => {
      taskScheduler.prepareResource(action);
      const ret = store.dispatch(action);
      taskScheduler.runTask(onYieldedFactory(action));
      taskScheduler.freeResource();

      return ret;
    };

    return { ...store, dispatch, replaceReducer };
  };
}

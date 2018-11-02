import { comparePath, getByPath, setByPath } from './path';
import { IAction } from './transpile';
import { TaskRunner } from './task';
import { getStateFactory } from './getState';
import { parseAction } from './action';
import { isIterator } from '../utils/is';

interface EnhancedStoreInterface {
  getState(path?: any): any;
  dispatch?(action: IAction): any;
  taskRunner?: TaskRunner;
  stateCache?: Map<string, any>;
}

const finalizeReducer = (state, action) => {
  if (action.type === '@@UPDATE' && action.meta && action.meta.finalize) {
    const localState = getByPath(state, action.meta.path);
    const updater = action.payload;
    const nextState = updater(localState);
    return setByPath(state, action.meta.path, nextState);
  } else {
    return state;
  }
};

export class ServiceGateway {
  store: EnhancedStoreInterface = {} as any;
  reducers: any[] = [];
  taskRunner: TaskRunner = {} as any;

  // instantiated enhancer:
  enhancer = createStore => (reducer, initialState, enhancer) => {
    this.store.taskRunner = this.taskRunner = new TaskRunner(this.store);
    this.store.stateCache = new Map();

    const _store = createStore(reducer, initialState, enhancer);
    Object.assign(this.store, _store);

    this.store.getState = getStateFactory(_store.getState);
    this.store.dispatch = action => {
      const value = _store.dispatch(action);
      this.taskRunner.run();
      return value;
    };
    return this.store;
  };

  reducer = (rootState: any, action: IAction, ...args: any[]) => {
    rootState = finalizeReducer(rootState, action);
    return this.reducers.reduce((rootState, reducer) => {
      if (reducer.asService) {
        let effectivePath: string | undefined;
        if (reducer.params) {
          const parsed = parseAction(action);
          effectivePath = parsed && parsed.path;
        } else {
          effectivePath = typeof reducer.path === 'string' ? reducer.path : '';
        }
        if (typeof effectivePath !== 'string') return rootState;
        const localState = getByPath(rootState, effectivePath);
        const nextState = reducer(localState, action, this.store);
        if (isIterator(nextState)) {
          this.taskRunner.registerTask({ path: effectivePath, work: nextState });
          return rootState;
        } else {
          this.store.stateCache!.delete(effectivePath);
          return setByPath(rootState, effectivePath, nextState);
        }
      } else {
        // handle normal reducer
        return args.length ? reducer(rootState, action, ...args) : reducer(rootState, action);
      }
    }, rootState);
  };

  use = (...reducers) => {
    reducers.forEach(reducer => {
      if (this.reducers.indexOf(reducer) !== -1) return false;

      this.reducers = this.reducers.concat(reducer);
      this.reducers.sort((r1, r2) => comparePath(r1.path, r2.path));
      return true;
    });
  };

  unuse = reducer => {
    if (this.reducers.indexOf(reducer) === -1) return false;
    this.reducers = this.reducers.filter(r => r !== reducer);
    return true;
  };
}

export const createServiceGateway = () => {
  return new ServiceGateway();
};

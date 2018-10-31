import { comparePath, getByPath, setByPath } from './path';
import { IAction } from './transpile';
import { TaskRunner } from './task';
import { getStateFactory } from './getState';
import { parseAction } from './action';

const isErgoComponent = (target: any) => {
  return Boolean(target.__ergo__);
};

interface EnhancedStoreInterface {
  getState(path?: any): any;
  dispatch?(action: IAction): any;
  taskRunner?: TaskRunner;
}

export class ServiceGateway {
  store: EnhancedStoreInterface = {} as any;
  reducers: any[] = [];
  taskRunner: TaskRunner = {} as any;

  // instantiated enhancer:
  enhancer = createStore => (reducer, initialState, enhancer) => {
    const store = createStore(reducer, initialState, enhancer);
    this.store = { ...store };
    this.store.taskRunner = this.taskRunner = new TaskRunner(this.store);
    this.store.getState = getStateFactory(store.getState);
    this.store.dispatch = action => {
      const value = store.dispatch(action);
      this.taskRunner.run();
      return value;
    };
    return this.store;
  };

  reducer = (rootState: any, action: IAction, ...args: any[]) => {
    const parsed = parseAction(action);
    return this.reducers.reduce((rootState, reducer) => {
      if (isErgoComponent(reducer)) {
        // handle ergo specific reducer
        let effectivePath: string | undefined;
        if (typeof reducer.__path__ == 'string') {
          effectivePath = reducer.__path__;
        } else {
          effectivePath = reducer.__params__ && parsed && parsed.path;
        }
        if (typeof effectivePath !== 'string') return rootState;
        const state = getByPath(rootState, effectivePath);
        const nextState = reducer(state, action, this.store);
        return setByPath(rootState, effectivePath, nextState);
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
      this.reducers.sort((r1, r2) => comparePath(r1.__path__, r2.__path__));
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

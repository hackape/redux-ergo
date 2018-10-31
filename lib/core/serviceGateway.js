"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("./path");
const task_1 = require("./task");
const getState_1 = require("./getState");
const action_1 = require("./action");
const isErgoComponent = (target) => {
    return Boolean(target.__ergo__);
};
class ServiceGateway {
    constructor() {
        this.store = {};
        this.reducers = [];
        this.taskRunner = {};
        // instantiated enhancer:
        this.enhancer = createStore => (reducer, initialState, enhancer) => {
            const store = createStore(reducer, initialState, enhancer);
            this.store = Object.assign({}, store);
            this.store.taskRunner = this.taskRunner = new task_1.TaskRunner(this.store);
            this.store.getState = getState_1.getStateFactory(store.getState);
            this.store.dispatch = action => {
                const value = store.dispatch(action);
                this.taskRunner.run();
                return value;
            };
            return this.store;
        };
        this.reducer = (rootState, action, ...args) => {
            const parsed = action_1.parseAction(action);
            return this.reducers.reduce((rootState, reducer) => {
                if (isErgoComponent(reducer)) {
                    // handle ergo specific reducer
                    let effectivePath;
                    if (typeof reducer.__path__ == 'string') {
                        effectivePath = reducer.__path__;
                    }
                    else {
                        effectivePath = reducer.__params__ && parsed && parsed.path;
                    }
                    if (typeof effectivePath !== 'string')
                        return rootState;
                    const state = path_1.getByPath(rootState, effectivePath);
                    const nextState = reducer(state, action, this.store);
                    return path_1.setByPath(rootState, effectivePath, nextState);
                }
                else {
                    // handle normal reducer
                    return args.length ? reducer(rootState, action, ...args) : reducer(rootState, action);
                }
            }, rootState);
        };
        this.use = (...reducers) => {
            reducers.forEach(reducer => {
                if (this.reducers.indexOf(reducer) !== -1)
                    return false;
                this.reducers = this.reducers.concat(reducer);
                this.reducers.sort((r1, r2) => path_1.comparePath(r1.__path__, r2.__path__));
                return true;
            });
        };
        this.unuse = reducer => {
            if (this.reducers.indexOf(reducer) === -1)
                return false;
            this.reducers = this.reducers.filter(r => r !== reducer);
            return true;
        };
    }
}
exports.ServiceGateway = ServiceGateway;
exports.createServiceGateway = () => {
    return new ServiceGateway();
};

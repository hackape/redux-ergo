'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const is_1 = require("../utils/is");
const action_1 = require("./action");
const getState_1 = require("./getState");
const memoizedApplyDeriveFactory = () => {
    let _target = undefined;
    return function applyDerive(derive, target) {
        if (target === _target)
            return target;
        if (!derive)
            return target;
        let derivedPropsDesc;
        if (is_1.isPlainObject(derive))
            derivedPropsDesc = derive;
        if (is_1.isFunction(derive)) {
            const derived = derive(target);
            if (derived && is_1.isPlainObject(derived)) {
                derivedPropsDesc = Object.keys(derived).reduce((descs, key) => {
                    if (target && target.hasOwnProperty && target.hasOwnProperty(key))
                        return descs;
                    descs[key] = {
                        configurable: true,
                        enumerable: false,
                        writable: false,
                        value: derived[key]
                    };
                    return descs;
                }, {});
            }
        }
        try {
            const derivedTarget = Object.defineProperties(target, derivedPropsDesc);
            _target = derivedTarget;
            return derivedTarget;
        }
        catch (err) {
            return target;
        }
    };
};
exports.reducerFactory = ({ __nsp__, __path__, __params__, mode, methods, proto, derive, defaultState }) => {
    const memoizedApplyDerive = memoizedApplyDeriveFactory();
    const _reducer = (state, action, env) => {
        // 1. set `defaultState`
        if (state === undefined && defaultState !== undefined)
            state = defaultState;
        // 2. check if should bypass responding on current action
        const parsed = action_1.parseAction(action);
        if (!parsed)
            return state;
        // console.trace(parsed);
        const { namespace, method: methodName, path } = parsed;
        const method = methods[methodName];
        const shouldBypass = namespace !== __nsp__ || !is_1.isFunction(method);
        if (shouldBypass)
            return state;
        // 3. now we actually handle the current action
        let taskRunner = undefined;
        if (env) {
            taskRunner = env.taskRunner;
        }
        // if finalize, simply return finalized state
        if (action.meta && action.meta.finalize)
            return action.payload;
        if (mode === 'FP') {
            const nextState = method.call(proto, state, ...action.payload);
            console.log('check next state', nextState);
            if (is_1.isIterator(nextState)) {
                if (taskRunner)
                    taskRunner.registerTask({ path, state, work: nextState, derive });
                return state;
            }
            else {
                return nextState;
            }
        }
    };
    // a housekeeping wrapper
    const reducer = (state, action, env) => {
        if (env) {
            getState_1.registerStore(env);
            env.active = true;
        }
        const nextState = _reducer(state, action, env);
        if (env)
            env.active = false;
        return derive ? memoizedApplyDerive(derive, nextState) : nextState;
    };
    // extra prop to inform gateway about self path
    if (__params__) {
        Object.defineProperty(reducer, '__params__', {
            enumerable: false,
            writable: false,
            configurable: false,
            value: __params__
        });
    }
    else {
        Object.defineProperty(reducer, '__path__', {
            enumerable: false,
            writable: false,
            configurable: false,
            value: __path__ || ''
        });
    }
    Object.defineProperty(reducer, '__ergo__', {
        enumerable: false,
        writable: false,
        configurable: false,
        value: true
    });
    return reducer;
};

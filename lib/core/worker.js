"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const as_mutable_1 = require("as-mutable");
const is_1 = require("../utils/is");
const middleware_1 = require("./middleware");
const effect_1 = require("./effect");
const getMutableStateWithProto = (plainStateObject, proto) => {
    const oldProto = plainStateObject && plainStateObject.__proto__;
    plainStateObject.__proto__ = proto;
    const mutableState = as_mutable_1.asMutable(plainStateObject);
    plainStateObject.__proto__ = oldProto;
    return mutableState;
};
const finalizeActionFactory = action => {
    const params = action.meta && action.meta.params;
    const finalizeAction = {
        type: action.type,
        meta: { finalize: true }
    };
    if (params)
        finalizeAction.meta.params = params;
    return payload => (Object.assign({}, finalizeAction, { payload }));
};
exports.workerFactory = (mode, workers, methodName) => {
    if (mode === 'OO') {
        return (prevState, action) => {
            // if finalize, simply return finalized state
            if (action.meta && action.meta.finalize)
                return action.payload;
            const getFinalizeAction = finalizeActionFactory(action);
            let oldProto, mutableState;
            if (is_1.isPrimitive(prevState)) {
                mutableState = prevState;
            }
            else {
                oldProto = prevState.__proto__;
                mutableState = getMutableStateWithProto(prevState, workers);
            }
            const getValueAndRevertProto = (target, proto) => {
                target = as_mutable_1.getValue(target);
                if (target)
                    target.__proto__ = proto;
                return target;
            };
            // actually call the fn()
            const ret = workers[methodName].apply(mutableState, action.payload);
            if (is_1.isPromise(ret)) {
                // 1. ret is a promise, meaning worker is async func
                // async threads:
                ret.then(() => {
                    const nextState = getValueAndRevertProto(mutableState, oldProto);
                    if (nextState !== prevState)
                        middleware_1.dispatch(getFinalizeAction(nextState));
                });
                return prevState; // no op in sync thread
            }
            else if (is_1.isGenerator(ret)) {
                // 2. ret is a generator, meaning worker is generator func
                // async threads:
                effect_1.iterateGenerator(ret, (__, stepId) => {
                    const nextState = getValueAndRevertProto(mutableState, oldProto);
                    if (nextState !== prevState) {
                        const msg = getFinalizeAction(nextState);
                        msg.meta.stepId = stepId;
                        middleware_1.dispatch(msg);
                    }
                });
                return prevState; // no op in sync thread
            }
            else {
                // 3. sync worker, normal reducer
                const nextState = getValueAndRevertProto(mutableState, oldProto);
                return nextState;
            }
        };
    }
    else {
        /* if (mode === 'FP') */
        return (prevState, action) => {
            // if finalize, simply return finalized state
            if (action.meta && action.meta.finalize)
                return action.payload;
            const getFinalizeAction = finalizeActionFactory(action);
            const ret = workers[methodName].call(workers, prevState, ...action.payload);
            if (is_1.isPromise(ret)) {
                // 1. ret is a promise, meaning worker is async func
                // async threads:
                ret.then(res => {
                    if (effect_1.shouldUpdateState(res))
                        middleware_1.dispatch(getFinalizeAction(res.value));
                });
                return prevState; // no op in sync thread
            }
            else if (is_1.isGenerator(ret)) {
                // 2. ret is a generator, meaning worker is generator func
                // async threads:
                effect_1.iterateGenerator(ret, (res, stepId) => {
                    if (effect_1.shouldUpdateState(res)) {
                        const msg = getFinalizeAction(res.value);
                        msg.meta.stepId = stepId;
                        middleware_1.dispatch(msg);
                    }
                });
                return prevState; // no op in sync thread
            }
            else {
                // 3. sync worker, normal reducer
                return ret;
            }
        };
    }
};

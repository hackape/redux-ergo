import { asMutable, getValue } from 'as-mutable';
import { isPrimitive, isPromise, isGenerator } from '../utils/is';
import { dispatch } from './middleware';
import { shouldUpdateState, iterateGenerator } from './effect';
import { IAction } from './transpile';

export type IWorkers<S> = {
  [x: string]: (state: S extends {} ? any : S, ...args: any[]) => any;
};

const getMutableStateWithProto = (plainStateObject, proto) => {
  const oldProto = plainStateObject && plainStateObject.__proto__;
  plainStateObject.__proto__ = proto;
  const mutableState = asMutable(plainStateObject);
  plainStateObject.__proto__ = oldProto;
  return mutableState;
};

const finalizeActionFactory = action => {
  const params = action.meta && action.meta.params;
  const finalizeAction = {
    type: action.type,
    meta: { finalize: true } as any
  };
  if (params) (finalizeAction.meta as any).params = params;
  return payload => ({ ...finalizeAction, payload });
};

export const workerFactory = (mode, workers, methodName) => {
  if (mode === 'OO') {
    return (prevState: any, action: IAction) => {
      // if finalize, simply return finalized state
      if (action.meta && action.meta.finalize) return action.payload;
      const getFinalizeAction = finalizeActionFactory(action);

      let oldProto, mutableState;
      if (isPrimitive(prevState)) {
        mutableState = prevState;
      } else {
        oldProto = prevState.__proto__;
        mutableState = getMutableStateWithProto(prevState, workers);
      }

      const getValueAndRevertProto = (target, proto) => {
        target = getValue(target);
        if (target) target.__proto__ = proto;
        return target;
      };

      // actually call the fn()
      const ret = workers[methodName].apply(mutableState, action.payload);

      if (isPromise(ret)) {
        // 1. ret is a promise, meaning worker is async func
        // async threads:
        ret.then(() => {
          const nextState = getValueAndRevertProto(mutableState, oldProto);
          if (nextState !== prevState) dispatch(getFinalizeAction(nextState));
        });

        return prevState; // no op in sync thread
      } else if (isGenerator(ret)) {
        // 2. ret is a generator, meaning worker is generator func
        // async threads:
        iterateGenerator(ret, (__, stepId) => {
          const nextState = getValueAndRevertProto(mutableState, oldProto);
          if (nextState !== prevState) {
            const msg = getFinalizeAction(nextState);
            msg.meta.stepId = stepId;
            dispatch(msg);
          }
        });

        return prevState; // no op in sync thread
      } else {
        // 3. sync worker, normal reducer
        const nextState = getValueAndRevertProto(mutableState, oldProto);
        return nextState;
      }
    };
  } else {
    /* if (mode === 'FP') */
    return (prevState: any, action: IAction) => {
      // if finalize, simply return finalized state
      if (action.meta && action.meta.finalize) return action.payload;
      const getFinalizeAction = finalizeActionFactory(action);

      const ret = workers[methodName].call(workers, prevState, ...action.payload);
      if (isPromise(ret)) {
        // 1. ret is a promise, meaning worker is async func
        // async threads:
        ret.then(res => {
          if (shouldUpdateState(res)) dispatch(getFinalizeAction(res.value));
        });

        return prevState; // no op in sync thread
      } else if (isGenerator(ret)) {
        // 2. ret is a generator, meaning worker is generator func
        // async threads:
        iterateGenerator(ret, (res, stepId) => {
          if (shouldUpdateState(res)) {
            const msg = getFinalizeAction(res.value);
            msg.meta.stepId = stepId;
            dispatch(msg);
          }
        });

        return prevState; // no op in sync thread
      } else {
        // 3. sync worker, normal reducer
        return ret;
      }
    };
  }
};

import { mutable, getValue } from './utils/im-mutable';
import { isPromise, isGenerator } from './utils/is';
import { dispatch } from './middleware';

const getMutableStateWithProto = (plainStateObject, proto) => {
  const oldProto = plainStateObject.__proto__;
  plainStateObject.__proto__ = proto;
  const mutableState = mutable(plainStateObject);
  plainStateObject.__proto__ = oldProto;
  return mutableState;
};

const finalizeActionFactory = action => {
  const params = action.meta && action.meta.params;
  const finalizeAction = {
    type: action.type,
    meta: { finalize: true }
  };
  if (params) (finalizeAction.meta as any).params = params;
  return payload => ({ ...finalizeAction, payload });
};

export const workerFactory = (mode, workers, methodName) => {
  if (mode === 'OO') {
    return (prevState: any, action: IAction) => {
      // if finalize, simply return finalized state
      if (action.meta && action.meta.finalize) return action.payload;

      // actually call the fn()
      const mutableState = getMutableStateWithProto(prevState, workers);
      const retValue = workers[methodName].apply(mutableState, action.payload);

      if (isPromise(retValue)) {
        const getFinalizeAction = finalizeActionFactory(action);

        retValue.then(value => {
          const nextState = getValue(mutableState);
          dispatch(getFinalizeAction(nextState));
        });

        return prevState;
      } else if (isGenerator(retValue)) {
        // TODO: to be implemented
      } else {
        const nextState = getValue(mutableState);
        return nextState;
      }
    };
  } else {
    /* if (mode === 'FP') */
    return (prevState: any, action: IAction) => {
      // if finalize, simply return finalized state
      if (action.meta && action.meta.finalize) return action.payload;

      const retValue = workers[methodName].call(workers, prevState, ...action.payload);
      if (isPromise(retValue)) {
        const getFinalizeAction = finalizeActionFactory(action);
        retValue.then(value => {
          dispatch(getFinalizeAction(value));
        });
      } else if (isGenerator(retValue)) {
        // TODO: to be implemented
      } else {
        return retValue;
      }
    };
  }
};

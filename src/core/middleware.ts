import { IAction } from './transpile';
import { getByPath } from './path';

type IEffector = (state, IAction) => IAction;

export interface IErgoMiddleware {
  ({ getState, dispatch }): (next: any) => (action: any) => any;
  run: (effector: IEffector) => void;
}

let _getState;
let _dispatch;
const effectorQueue: IEffector[] = [];

export const middleware = (({ getState, dispatch }) => {
  _getState = getState;
  _dispatch = dispatch;

  return next => action => {
    if (action.meta && action.meta.ergoEffect) {
      const state = getState();
      effectorQueue.forEach(effector => {
        effector(state, action);
      });
    } else {
      return next(action);
    }
  };
}) as IErgoMiddleware;

middleware.run = (effector: IEffector) => {
  effectorQueue.push(effector);
};

export const dispatch = (action: IAction) => {
  if (!_dispatch) {
    throw Error('[redux-ergo] You must apply the `ergoMiddleware` first.');
  }
  return _dispatch(action) as IAction;
};

export const getState = (path?: string) => {
  if (!_getState) {
    throw Error('[redux-ergo] You must apply the `ergoMiddleware` first.');
  }

  const currentState = _getState() as any;

  if (!path) return currentState;
  return getByPath(currentState, path);
};

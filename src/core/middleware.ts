import { IAction } from './transpile';

type IEffector = (state, IAction) => IAction;

export interface IErgoMiddleware {
  ({ getState, dispatch }): (next: any) => (action: any) => any;
  run: (effector: IEffector) => void;
}

let _dispatch;
const effectorQueue: IEffector[] = [];

export const middleware = (({ getState, dispatch }) => {
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

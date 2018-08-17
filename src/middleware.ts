let _dispatch;

export type IAction = {
  type: string;
  meta?: {
    params?: { [x: string]: string | number };
    finalize?: boolean;
  };
  payload?: any;
  error?: boolean;
};

type IEffector = (state, IAction) => IAction;

interface IErgoMiddleware {
  ({ getState, dispatch }): (next: any) => (action: any) => any;
  run: (effector: IEffector) => void;
}

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

middleware.run = effector => {
  effectorQueue.push(effector);
};

export const dispatch = (action: IAction) => {
  if (!_dispatch) {
    throw Error('[redux-ergo] You must apply the `ergoMiddleware` first.');
  }
  return _dispatch(action);
};

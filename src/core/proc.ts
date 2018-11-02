import { isPromise, isIterator } from '../utils/is';

interface INext {
  (val?: any, isErr?: boolean): any;
  step: number;
}

const noop = (...args: any[]) => {};

function resolvePromise(env: any, promise: Promise<any>, cb: INext) {
  promise.then(cb, err => cb(err, true));
}

function resolveIterator(env: any, iterator: Iterator<any>, cb: INext) {
  proc(env, iterator, cb);
}

function runSelectEffect(env, { selector, args }, cb: INext) {
  try {
    const state = selector(env.getState(), ...args);
    cb(state);
  } catch (error) {
    cb(error, true);
  }
}

function runUpdateEffect(env, { path, updater }, cb) {
  env.dispatch({
    type: '@@UPDATE',
    meta: {
      finalize: true,
      path: path !== undefined ? path : env.task.path
    },
    payload: updater
  });
}

function runEffect(env, effect, next: INext) {
  if (isPromise(effect)) {
    return resolvePromise(env, effect as Promise<any>, next);
  }
  if (isIterator(effect)) {
    return resolveIterator(env, effect as Iterator<any>, next);
  }

  const { type, payload } = effect || ({} as any);
  switch (type) {
    case 'SELECT':
      return runSelectEffect(env, payload, next);
    case 'UPDATE':
      return runUpdateEffect(env, payload, next);
    default:
      return next(effect);
  }
}

export function proc(env, iterator: Iterator<any>, cont = noop) {
  const next: any = (arg?: any, isErr?: boolean) => {
    try {
      const result = isErr ? iterator.throw!(arg) : iterator.next(arg);

      if (!result.done) {
        runEffect(env, result.value, next as any);
      } else {
        runEffect(env, result.value, cont as any);
      }
    } catch (err) {
      cont(err, true);
    }
    next.step++;
  };

  next.step = 0;

  next();
}

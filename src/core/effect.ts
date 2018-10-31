import { isFunction } from '../utils/is';
import { invariant } from '../utils/invariant';

const isEffectSymbol = Symbol('isEffect');
const isEffectUpdateSymbol = Symbol('isEffectUpdate');

export const isEffect = (fn: Function) => Boolean(fn && fn[isEffectSymbol]);

type BabelDescriptor = PropertyDescriptor & { initializer?: () => any };

export function effectDecorator<T>(target: T): T;
export function effectDecorator<T>(target: any, prop: string, descriptor: BabelDescriptor): T;
export function effectDecorator(...args: any[]) {
  const [target, prop, descriptor] = args;
  if (arguments.length === 1) {
    if (target) target[isEffectSymbol] = true;
    return target;
  }

  const desc = descriptor || Object.getOwnPropertyDescriptor(target, prop);
  if (desc.value && isFunction(desc.value)) {
    desc.value[isEffectSymbol] = true;
    return desc;
  } else if (desc.initializer) {
    // babel only
    return {
      enumerable: false,
      configurable: true,
      writable: true,
      initializer() {
        const fn = desc.initializer.call(this);
        if (isFunction(fn)) fn[isEffectSymbol] = true;
        return fn;
      }
    };
  }
  return desc;
}

export const setState = (value: any) => ({ value, [isEffectUpdateSymbol]: true });
export const shouldUpdateState = (target: any) => Boolean(target && target[isEffectUpdateSymbol]);

export function iterateGenerator(gen: Generator, onYielded: ((value: any, stepId: number) => any)) {
  let pendingStepPromise: Promise<any>;

  const res = new Promise(function(resolve, reject) {
    let stepId = 0;

    function onFulfilled(res: any) {
      let ret;
      try {
        ret = gen.next(res);
        next(ret);
      } catch (e) {
        return reject(e);
      }
    }

    function onRejected(err: any) {
      let ret;
      try {
        ret = gen.throw!(err);
      } catch (e) {
        return reject(e);
      }
      next(ret);
    }

    function next(ret: any) {
      if (ret.done) return resolve(ret.value);

      // ret is an async iterator
      if (typeof ret.then === 'function') {
        invariant(false, '[redux-ergo] Async generator function is not supported yet.');
      }

      if (ret.value && typeof ret.value.then === 'function') {
        pendingStepPromise = Promise.resolve(ret.value);
        return pendingStepPromise.then(onFulfilled, onRejected);
      }

      onYielded(ret.value, stepId++);
    }

    onFulfilled(undefined); // kick off the process
  }) as any;

  return res;
}

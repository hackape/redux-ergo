import { isFunction } from '../utils/is';
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

export const update = (value: any) => ({ value, [isEffectUpdateSymbol]: true });
export const shouldUpdateState = (target: any) => Boolean(target && target[isEffectUpdateSymbol]);

export function iterateGenerator(gen: Generator, onYield: ((value: any, stepId: number) => any)) {
  let pendingStepPromise: Promise<any> | undefined = undefined;

  const res = new Promise(function(resolve, reject) {
    let stepId = 0;

    function onFulfilled(res: any) {
      pendingStepPromise = undefined;
      let ret;
      try {
        ret = gen.next(res);
      } catch (e) {
        return reject(e);
      }

      next(ret);
    }

    function onRejected(err: any) {
      pendingStepPromise = undefined;
      let ret;
      try {
        ret = gen.throw!(err);
      } catch (e) {
        return reject(e);
      }
      next(ret);
    }

    function next(ret: any) {
      if (ret && typeof ret.then === 'function') {
        // an async iterator
        ret.then(next, reject);
        return;
      }

      onYield(ret.value, stepId++);
      if (ret.done) return resolve(ret.value);
      pendingStepPromise = Promise.resolve(ret.value) as any;
      return pendingStepPromise!.then(onFulfilled, onRejected);
    }

    onFulfilled(undefined); // kick off the process
  }) as any;

  return res;
}

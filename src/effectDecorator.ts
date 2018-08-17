import { isFunction } from './utils/is';
const symbol = Symbol('effect');
export const isEffect = (fn: Function) => Boolean(fn && fn[symbol]);

type BabelDescriptor = PropertyDescriptor & { initializer?: () => any };

export function effectDecorator<T>(target: T): T;
export function effectDecorator<T>(target: any, prop: string, descriptor: BabelDescriptor): T;
export function effectDecorator(...args: any[]) {
  const [target, prop, descriptor] = args;
  if (arguments.length === 1) {
    if (target) target[symbol] = true;
    return target;
  }

  const desc = descriptor || Object.getOwnPropertyDescriptor(target, prop);
  if (desc.value && isFunction(desc.value)) {
    desc.value[symbol] = true;
    return desc;
  } else if (desc.initializer) {
    // babel only
    return {
      enumerable: false,
      configurable: true,
      writable: true,
      initializer() {
        const fn = desc.initializer.call(this);
        if (isFunction(fn)) fn[symbol] = true;
        return fn;
      }
    };
  }
  return desc;
}

const symbol = Symbol('effect');

export const isEffect = fn => Boolean(fn && fn[symbol]);

export function effectDecorator(target, propertyName, descriptor) {
  if (arguments.length === 1) {
    if (target) target[symbol] = true;
    return target;
  }
  if (descriptor.value && typeof descriptor.value === 'function') {
    descriptor.value[symbol] = true;
    return descriptor;
  }
}

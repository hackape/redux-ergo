export const isPrimitive = target => {
  switch (typeof target) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'undefined':
      return true;
  }
  if (target === null) return true;
  return false;
};

export const isFunction = target => typeof target === 'function';

export const isPlainObject = target => {
  if (!target) return false;
  if (Object.prototype.toString.call(target) !== '[object Object]')
    return false;

  const proto = isFunction(Object.getPrototypeOf)
    ? Object.getPrototypeOf(target)
    : target.__proto__;

  if (!proto) return true; // in case `target = Object.create(null)`
  if (proto !== Object.prototype) return false;

  return true;
};

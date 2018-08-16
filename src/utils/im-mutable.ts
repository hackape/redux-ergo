import { isPrimitive } from './is';

const UNWRAP = Symbol('UNWRAP');

export function getValue(mutable) {
  if (mutable && mutable[UNWRAP]) {
    return mutable[UNWRAP]();
  } else {
    return mutable;
  }
}

export function mutable(target, parentProxy?, subpath?) {
  if (isPrimitive(target) || typeof target === 'function') {
    return target;
  }

  const mutations = new Map();

  const targetType = Array.isArray(target) ? 'array' : 'object';
  let __proto__ = target.__proto__;
  const result = targetType === 'array' ? [...target] : { ...target };

  const unwrap = () => {
    if (!mutations.size) return target;

    mutations.forEach((record, key) => {
      let unwrappedValue;
      if (record.op === 'set') {
        try {
          const childUnwrap = result[key][UNWRAP];
          if (childUnwrap) {
            unwrappedValue = childUnwrap();
          }
        } catch (err) {
          /*noop*/
        }
        if (unwrappedValue) result[key] = unwrappedValue;
      }
    });

    return result;
  };

  const handler = {
    get(target, key) {
      if (key === UNWRAP) return unwrap;
      if (key === '__proto__') return __proto__;

      let value;
      if (result.hasOwnProperty(key)) {
        value = result[key];
      } else {
        value = __proto__[key];
      }

      return mutable(value, proxy, key);
    },

    set(target, key, value, receiver) {
      if (key === '__proto__') {
        __proto__ = value;
        return true;
      }

      mutations.set(key, { op: 'set', value });

      if (parentProxy) {
        parentProxy[subpath] = receiver;
      }

      return Reflect.set(result, key, value);
    },

    deleteProperty(target, key) {
      if (target.hasOwnProperty(key)) mutations.set(key, { op: 'delete' });

      return Reflect.deleteProperty(result, key);
    },

    ownKeys(target) {
      return Reflect.ownKeys(result);
    },

    has(target, key) {
      return Reflect.has(result, key);
    },

    defineProperty(target, key, desc) {
      return Reflect.defineProperty(result, key, desc);
    },

    getOwnPropertyDescriptor(target, key) {
      return Reflect.getOwnPropertyDescriptor(result, key);
    }
  };

  const proxy = new Proxy(target, handler);
  return proxy;
}

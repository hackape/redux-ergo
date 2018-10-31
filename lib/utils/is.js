"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPrimitive = target => {
    switch (typeof target) {
        case 'string':
        case 'number':
        case 'boolean':
        case 'undefined':
            return true;
    }
    if (target === null)
        return true;
    return false;
};
exports.isFunction = target => typeof target === 'function';
exports.isPlainObject = target => {
    if (!target)
        return false;
    if (Object.prototype.toString.call(target) !== '[object Object]')
        return false;
    const proto = exports.isFunction(Object.getPrototypeOf)
        ? Object.getPrototypeOf(target)
        : target.__proto__;
    if (!proto)
        return true; // in case `target = Object.create(null)`
    if (proto !== Object.prototype)
        return false;
    return true;
};
exports.isPromise = target => target instanceof Promise || (target && exports.isFunction(target.then));
exports.isIterator = target => target &&
    exports.isFunction(target['next']) &&
    exports.isFunction(target['throw']) &&
    exports.isFunction(target['return']) &&
    exports.isFunction(target[Symbol.iterator]);

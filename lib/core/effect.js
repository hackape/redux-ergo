"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const is_1 = require("../utils/is");
const invariant_1 = require("../utils/invariant");
const isEffectSymbol = Symbol('isEffect');
const isEffectUpdateSymbol = Symbol('isEffectUpdate');
exports.isEffect = (fn) => Boolean(fn && fn[isEffectSymbol]);
function effectDecorator(...args) {
    const [target, prop, descriptor] = args;
    if (arguments.length === 1) {
        if (target)
            target[isEffectSymbol] = true;
        return target;
    }
    const desc = descriptor || Object.getOwnPropertyDescriptor(target, prop);
    if (desc.value && is_1.isFunction(desc.value)) {
        desc.value[isEffectSymbol] = true;
        return desc;
    }
    else if (desc.initializer) {
        // babel only
        return {
            enumerable: false,
            configurable: true,
            writable: true,
            initializer() {
                const fn = desc.initializer.call(this);
                if (is_1.isFunction(fn))
                    fn[isEffectSymbol] = true;
                return fn;
            }
        };
    }
    return desc;
}
exports.effectDecorator = effectDecorator;
exports.setState = (value) => ({ value, [isEffectUpdateSymbol]: true });
exports.shouldUpdateState = (target) => Boolean(target && target[isEffectUpdateSymbol]);
function iterateGenerator(gen, onYielded) {
    let pendingStepPromise;
    const res = new Promise(function (resolve, reject) {
        let stepId = 0;
        function onFulfilled(res) {
            let ret;
            try {
                ret = gen.next(res);
                next(ret);
            }
            catch (e) {
                return reject(e);
            }
        }
        function onRejected(err) {
            let ret;
            try {
                ret = gen.throw(err);
            }
            catch (e) {
                return reject(e);
            }
            next(ret);
        }
        function next(ret) {
            if (ret.done)
                return resolve(ret.value);
            // ret is an async iterator
            if (typeof ret.then === 'function') {
                invariant_1.invariant(false, '[redux-ergo] Async generator function is not supported yet.');
            }
            if (ret.value && typeof ret.value.then === 'function') {
                pendingStepPromise = Promise.resolve(ret.value);
                return pendingStepPromise.then(onFulfilled, onRejected);
            }
            onYielded(ret.value, stepId++);
        }
        onFulfilled(undefined); // kick off the process
    });
    return res;
}
exports.iterateGenerator = iterateGenerator;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const is_1 = require("../utils/is");
const noop = (...args) => { };
function resolvePromise(env, promise, cb) {
    promise.then(cb, err => cb(err, true));
}
function resolveIterator(env, iterator, cb) {
    proc(env, iterator, cb);
}
function runSelectEffect(env, { selector, args }, cb) {
    try {
        const state = selector(env.getState(), ...args);
        cb(state);
    }
    catch (error) {
        cb(error, true);
    }
}
/**
 * yield update(state => {
 *
 * })
 
function runUpdateEffect(env, { action, update }, cb) {
  if (isFunction(update)) {
    const nextState = update(env.getState(path));
  }
}
*/
function runEffect(env, effect, next) {
    if (is_1.isPromise(effect)) {
        return resolvePromise(env, effect, next);
    }
    if (is_1.isIterator(effect)) {
        return resolveIterator(env, effect, next);
    }
    const { type, payload } = effect || {};
    switch (type) {
        case 'SELECT':
            return runSelectEffect(env, payload, next);
        case 'UPDATE':
            return;
        default:
            return next(effect);
    }
}
function proc(env, iterator, cont = noop) {
    const next = (arg, isErr) => {
        try {
            const result = isErr ? iterator.throw(arg) : iterator.next(arg);
            if (!result.done) {
                runEffect(env, result.value, next);
            }
            else {
                runEffect(env, result.value, cont);
            }
        }
        catch (err) {
            cont(err, true);
        }
        next.step++;
    };
    next.step = 0;
    next();
}
exports.proc = proc;

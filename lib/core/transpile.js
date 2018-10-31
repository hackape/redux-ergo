"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const is_1 = require("../utils/is");
const path_1 = require("./path");
const invariant_1 = require("../utils/invariant");
const reducerFactory_1 = require("./reducerFactory");
const action_1 = require("./action");
function transpile(spec, override = {}) {
    let mode;
    const specNsp = override.namespace || spec.namespace || '';
    const specPath = override.path || spec.path || '/';
    const specPathParams = override.pathParams || spec.pathParams;
    // preliminary validation
    invariant_1.invariant(!specNsp.includes('/'), '[redux-ergo] `namespace` must not contain "/"');
    invariant_1.invariant(typeof specPath === 'string' && specPath.startsWith('/'), '[redux-ergo] `path` must be a string that starts with "/", got "%s".', specPath);
    invariant_1.invariant(specPathParams === undefined || is_1.isPlainObject(specPathParams), '[redux-ergo] `pathParams` must be undefined or plain object');
    const __nsp__ = specNsp;
    const __path__ = specPath.replace(/\/{1,}$/, ''); // trim trailing slashes
    const __params__ = specPathParams;
    // preliminary validation passed, double check `path` and `pathParams`
    if (path_1.hasPathPattern(__path__)) {
        const paramKeys = __path__.split('/').filter(pathComp => pathComp[0] === ':');
        if (__params__ === undefined) {
            invariant_1.invariant(false, '[redux-ergo] Your `path` has path param patterns ' +
                paramKeys.map(key => `"${key}"`).join(', ') +
                ' , but you did not specify `pathParams`.');
        }
        else {
            const missedOutKeys = paramKeys.filter(key => !__params__.hasOwnProperty(key.slice(1)));
            if (missedOutKeys.length) {
                invariant_1.invariant(false, '[redux-ergo] The following path params are not declared in the `pathParams` object, please double check: ' +
                    missedOutKeys.map(key => `"${key}"`).join(', '));
            }
        }
    }
    const defaultState = override.defaultState || spec.defaultState;
    let specMethods = {};
    let specDerive;
    let actions = {};
    const methods = {};
    let proto;
    if (is_1.isFunction(spec)) {
        mode = 'OO';
        proto = spec.prototype || {};
        const protoKey = Object.getOwnPropertyNames(proto);
        for (const key of protoKey) {
            if (key === 'constructor')
                continue;
            const desc = Object.getOwnPropertyDescriptor(proto, key) || {};
            if (is_1.isFunction(desc.value)) {
                specMethods[key] = desc.value;
            }
            else if (is_1.isFunction(desc.get)) {
                if (!specDerive)
                    specDerive = {};
                specDerive[key] = desc;
            }
        }
    }
    else {
        mode = 'FP';
        specMethods = spec.reducers;
        specDerive = spec.derive;
        proto = Object.assign({}, specMethods);
    }
    for (const methodName in specMethods) {
        actions[methodName] = (...args) => {
            return {
                type: action_1.createActionType(__nsp__, methodName, __path__),
                payload: args
            };
        };
        methods[methodName] = specMethods[methodName];
    }
    if (__params__) {
        actions = action_1.withPathParams(actions);
    }
    const reducer = reducerFactory_1.reducerFactory({
        __nsp__,
        __path__,
        __params__,
        mode,
        methods,
        proto,
        derive: specDerive,
        defaultState
    });
    return {
        actions,
        reducer
    };
}
exports.transpile = transpile;

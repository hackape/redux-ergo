"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("./path");
const is_1 = require("../utils/is");
const isPathPattern = (path) => /\/\:[^\/]+/.test(path);
function parseAction(__nsp__, __path__, action) {
    // 1. validate `action.type` matches the "namespace/path/method" pattern
    if (!action || typeof action.type !== 'string')
        return [false, null];
    const matched = action.type.match(/^([^\/]*)((?:\/[^\/]+)*)\/([^\/]+)$/);
    if (!matched)
        return [false, null];
    // 2. validate `path` and `namespace` match spec
    let isOwnScope = false;
    const [namespace, path, method] = matched.slice(1);
    if (namespace === __nsp__ && path === __path__)
        isOwnScope = true;
    return [isOwnScope, method];
}
function applyDerive(derive, target, rootState) {
    if (!derive)
        return target;
    let derivedPropsDesc;
    if (is_1.isPlainObject(derive))
        derivedPropsDesc = derive;
    if (is_1.isFunction(derive)) {
        const derived = derive(target, rootState);
        if (derived && is_1.isPlainObject(derived)) {
            derivedPropsDesc = Object.keys(derived).reduce((descs, key) => {
                if (target && target.hasOwnProperty && target.hasOwnProperty(key))
                    return descs;
                descs[key] = {
                    configurable: true,
                    enumerable: false,
                    writable: false,
                    value: derived[key]
                };
                return descs;
            }, {});
        }
    }
    try {
        return Object.defineProperties(target, derivedPropsDesc);
    }
    catch (err) {
        return target;
    }
}
exports.gatewayFactory = (__nsp__, __path__, workers, derive, defaultState) => {
    const isStablePath = !isPathPattern(__path__);
    return (rootState, action) => {
        const [isOwnScope, method] = parseAction(__nsp__, __path__, action);
        const worker = isOwnScope && method !== null ? workers[method] : undefined;
        let effectivePath = null;
        if (isStablePath) {
            effectivePath = __path__;
        }
        else {
            if (isOwnScope) {
                const pathParams = (action.meta && action.meta.params) || undefined;
                try {
                    effectivePath = path_1.fillInPathParams(__path__, pathParams);
                }
                catch (err) {
                    console && console.warn && console.warn(err);
                    effectivePath = null;
                }
            }
            else {
                effectivePath = null;
            }
        }
        // 1. if `effectivePath` is null, there is nothing we can do, not even provide the `defaultState`.
        if (effectivePath === null)
            return rootState;
        const oldLocalState = path_1.getByPath(rootState, effectivePath);
        // 2. if we have `effectivePath`, but not `worker`, we can at least provide the `defaultState`
        // equivalent to `reducer(state = defaultState, action)`
        const localState = oldLocalState === undefined ? defaultState : oldLocalState;
        // 3. best case, both `effectivePath` and `worker` exist.
        const newLocalState = worker ? worker(localState, action) : localState;
        if (newLocalState === oldLocalState) {
            return rootState;
        }
        else {
            rootState = path_1.setByPath(rootState, effectivePath, newLocalState);
            applyDerive(derive, newLocalState, rootState);
            return rootState;
        }
    };
};

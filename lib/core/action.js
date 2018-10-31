"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const is_1 = require("../utils/is");
const path_1 = require("./path");
function parseAction(action) {
    // 1. validate `action.type` matches the "namespace.method@path" pattern
    if (!action || typeof action.type !== 'string')
        return;
    // const matched = (action.type as string).match(/^([^\/]*)((?:\/[^\/]+)*)\/([^\/]+)$/);
    const matched = action.type.match(/^(?:([^\.@ ]+)\.){0,1}([^\.@ ]+){1}(?: ?@((?:\/[^\/]+)+|\/)\/?){0,1}$/);
    if (!matched)
        return;
    // 2. validate `path` and `namespace` match spec
    const [namespace, method, path] = matched.slice(1);
    return { namespace, path, method };
}
exports.parseAction = parseAction;
function createActionType(namespace, method, path) {
    return `${namespace ? namespace + '.' : ''}${method}${path ? ' @' + path : ''}`;
}
exports.createActionType = createActionType;
function finalizeActionFactory(action) {
    const finalizeAction = {
        type: action.type,
        meta: { finalize: true }
    };
    return payload => (Object.assign({}, finalizeAction, { payload }));
}
exports.finalizeActionFactory = finalizeActionFactory;
function _withPathParams(fn) {
    if (!is_1.isFunction(fn))
        return fn;
    return (params, ...args) => {
        const actionMsg = fn(...args);
        const parsed = parseAction(actionMsg);
        if (!parsed)
            throw Error("[redux-ergo] Action type is not compilant to redux-ergo's protocal");
        const effectivePath = path_1.fillInPathParams(parsed.path, params || {});
        const actionType = createActionType(parsed.namespace, parsed.method, effectivePath);
        actionMsg.type = actionType;
        return actionMsg;
    };
}
function withPathParams(actions) {
    if (typeof actions === 'function') {
        return _withPathParams(actions);
    }
    else {
        const _actions = {};
        for (const method in actions) {
            _actions[method] = _withPathParams(actions[method]);
        }
        return _actions;
    }
}
exports.withPathParams = withPathParams;

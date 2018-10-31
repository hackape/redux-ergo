"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("./path");
let _getState;
let _dispatch;
const effectorQueue = [];
exports.middleware = (({ getState, dispatch }) => {
    _getState = getState;
    _dispatch = dispatch;
    return next => action => {
        if (action.meta && action.meta.ergoEffect) {
            const state = getState();
            effectorQueue.forEach(effector => {
                effector(state, action);
            });
        }
        else {
            return next(action);
        }
    };
});
exports.middleware.run = (effector) => {
    effectorQueue.push(effector);
};
exports.dispatch = (action) => {
    if (!_dispatch) {
        throw Error('[redux-ergo] You must apply the `ergoMiddleware` first.');
    }
    return _dispatch(action);
};
exports.getState = (path = '') => {
    if (!_getState) {
        throw Error('[redux-ergo] You must apply the `ergoMiddleware` first.');
    }
    const currentState = _getState();
    if (!path)
        return currentState;
    return path_1.getByPath(currentState, String(path));
};

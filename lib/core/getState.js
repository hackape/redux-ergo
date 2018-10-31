"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("./path");
const is_1 = require("../utils/is");
const storeInstances = [];
function validateStoreInstance(store) {
    return store && is_1.isFunction(store.getState);
}
function registerStore(store) {
    if (!validateStoreInstance(store))
        return false;
    const index = storeInstances.indexOf(store);
    if (index === -1) {
        storeInstances.push(store);
    }
}
exports.registerStore = registerStore;
// function getActiveRuntimeHelper() {}
exports.getStateFactory = (_getState) => {
    const getState = (path) => {
        const currentState = _getState();
        if (!path)
            return currentState;
        return path_1.getByPath(currentState, String(path));
    };
    return getState;
};
exports.getState = (path) => {
    const activeInstance = storeInstances.find(instance => instance.active);
    return activeInstance.getState(path);
};

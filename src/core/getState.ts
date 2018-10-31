import { getByPath } from './path';
import { isFunction } from '../utils/is';

const storeInstances: any[] = [];

function validateStoreInstance(store: any) {
  return store && isFunction(store.getState);
}

export function registerStore(store: any) {
  if (!validateStoreInstance(store)) return false;
  const index = storeInstances.indexOf(store);
  if (index === -1) {
    storeInstances.push(store);
  }
}

// function getActiveRuntimeHelper() {}

export const getStateFactory = (_getState: () => any) => {
  const getState = (path?: any) => {
    const currentState = _getState();
    if (!path) return currentState;
    return getByPath(currentState, String(path));
  };

  return getState;
};

export const getState = (path?: any) => {
  const activeInstance = storeInstances.find(instance => instance.active);
  return activeInstance.getState(path);
};

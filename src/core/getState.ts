import { getByPath } from './path';
import { getActiveStore } from './storeTracker';

export const getStateFactory = (_getState: () => any) => {
  const getState = (path?: any) => {
    const currentState = _getState();
    if (!path) return currentState;
    return getByPath(currentState, String(path));
  };

  return getState;
};

export const getState = (path?: any) => {
  const activeStore = getActiveStore();
  if (activeStore) {
    return activeStore.getState(path);
  } else {
    throw Error(
      '[redux-ergo] cannot call `getState()` without a redux store or a custom `getState()` implementation'
    );
  }
};

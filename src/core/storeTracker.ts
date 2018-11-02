export let activeStore;

function validateStoreInstance(store: any) {
  return store && typeof store.getState === 'function';
}

export function activateStore(store: any) {
  if (!validateStoreInstance(store)) return false;
  activeStore = store;
  return true;
}

export function deactivateStore(store: any) {
  activeStore = undefined;
  return true;
}

type IStore = {
  getState(path?: string): any;
};

export function getActiveStore(): IStore | undefined {
  return activeStore;
}

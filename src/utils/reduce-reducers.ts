export function reduceReducers(...args) {
  const defaultState = typeof args[args.length - 1] !== 'function' ? args.pop() : undefined;
  const reducers = args;

  reducers.forEach((reducer, index) => {
    if (typeof reducer !== 'function') {
      throw Error(`[reduceReducers] An invalid reducer was passed in at index ${index}`);
    }
  });

  return (prevState = defaultState, action, ...args) => {
    return reducers.reduce((state, reducer) => {
      return reducer(state, action, ...args);
    }, prevState);
  };
}

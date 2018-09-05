type IAction = {
  type: string;
  meta?: {
    params?: { [x: string]: string | number };
    finalize?: boolean;
  };
  payload?: any;
  error?: boolean;
};
type MethodProps<T> = ({ [K in keyof T]: T[K] extends Function ? K : never })[keyof T];
type MethodsOf<T> = { [K in MethodProps<T>]: T[K] };
// @ts-ignore
type ActionCreator<T> = T extends (...args: infer Args) => any ? (...args: Args) => IAction : T;
type ActionsOf<T> = { [K in MethodProps<T>]: ActionCreator<T[K]> };

type ActionCreator1<T> = T extends (state: any, ...args: infer Args) => any
  ? (...args: Args) => IAction
  : any;

interface ISpecObject<S, P, R, E> {
  path?: string;
  pathParams?: P;
  namespace?: string;
  defaultState?: S;
  reducers: R;
  effects?: E;
}

interface ISpecClass<S, P, R> {
  new (): R;
  path?: string;
  pathParams?: P;
  namespace?: string;
  defaultState?: S;
}

type Workers<S> = {
  [x: string]: (state: S extends {} ? any : S, ...args: any[]) => any;
};

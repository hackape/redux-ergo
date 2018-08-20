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

declare type IWorkers<S> = {
    [x: string]: (state: S extends {} ? any : S, ...args: any[]) => any;
};
export declare type IAction = {
    type: string;
    meta?: {
        params?: {
            [x: string]: string | number;
        };
        finalize?: boolean;
    };
    payload?: any;
    error?: boolean;
};
declare type MethodProps<T> = ({
    [K in keyof T]: T[K] extends Function ? K : never;
})[keyof T];
declare type ActionCreator<T> = T extends (s: any, ...args: infer A) => any ? (...args: A) => IAction : T;
declare type ActionCreator1<T> = T extends (...args: infer A) => any ? (...args: A) => IAction : T;
interface ISpecObject<S, P, R, E> {
    path?: string;
    pathParams?: P;
    namespace?: string;
    defaultState?: S;
    reducers: R;
}
interface ISpecClass<S, P, R> {
    new (): R;
    path?: string;
    pathParams?: P;
    namespace?: string;
    defaultState?: S;
}
declare type IOverride<P, S> = {
    path?: string;
    namespace?: string;
    pathParams?: P;
    defaultState?: S;
};
export declare function transpile<S, P, R extends IWorkers<S>, E extends IWorkers<S>>(spec: ISpecObject<S, P, R, E>): {
    actions: {
        [K in keyof (E extends undefined ? R : R & E)]: P extends {} ? ActionCreator<(E extends undefined ? R : R & E)[K]> : (params: P) => ActionCreator<(E extends undefined ? R : R & E)[K]>;
    };
    reducer: (rootState: any, action: IAction) => any;
};
export declare function transpile<S, P, R extends IWorkers<S>, E extends IWorkers<S>>(spec: ISpecObject<any, any, R, E>, override: IOverride<P, S>): {
    actions: {
        [K in keyof (E extends undefined ? R : R & E)]: P extends {} ? ActionCreator<(E extends undefined ? R : R & E)[K]> : (params: P) => ActionCreator<(E extends undefined ? R : R & E)[K]>;
    };
    reducer: (rootState: any, action: IAction) => any;
};
export declare function transpile<S, P, R>(spec: ISpecClass<S, P, R>): {
    actions: {
        [K in MethodProps<R>]: P extends {} ? ActionCreator1<R[K]> : (params: P) => ActionCreator1<R[K]>;
    };
    reducer: (rootState: any, action: IAction) => any;
};
export declare function transpile<S, P, R>(spec: ISpecClass<any, any, R>, override: IOverride<P, S>): {
    spec: typeof spec;
    actions: {
        [K in MethodProps<R>]: P extends {} ? ActionCreator1<R[K]> : (params: P) => ActionCreator1<R[K]>;
    };
    reducer: (rootState: any, action: IAction) => any;
};
export {};

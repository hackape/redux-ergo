export declare function parseAction(action: any): {
    namespace: string;
    path: string;
    method: string;
} | undefined;
export declare function createActionType(namespace: any, method: any, path: any): string;
export declare function finalizeActionFactory(action: any): (payload: any) => {
    payload: any;
    type: any;
    meta: any;
};
declare type IArgsOf<F> = F extends (...args: infer A) => infer R ? A : any;
declare type IReturnOf<F> = F extends (...args: infer A) => infer R ? R : any;
export declare function withPathParams<A extends any[], R>(action: (...args: A) => R): (params: any, ...args: A) => R;
export declare function withPathParams<A>(actions: A): {
    [M in keyof A]: (params: A extends {
        __params__: any;
    } ? A['__params__'] : any, ...args: IArgsOf<A[M]>) => IReturnOf<A[M]>;
};
export {};

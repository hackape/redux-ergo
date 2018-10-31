import { IAction } from './transpile';
export declare type IWorkers<S> = {
    [x: string]: (state: S extends {} ? any : S, ...args: any[]) => any;
};
export declare const workerFactory: (mode: any, workers: any, methodName: any) => (prevState: any, action: IAction) => any;

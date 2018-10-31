import { IAction } from './transpile';
declare type IEffector = (state: any, IAction: any) => IAction;
export interface IErgoMiddleware {
    ({ getState, dispatch }: {
        getState: any;
        dispatch: any;
    }): (next: any) => (action: any) => any;
    run: (effector: IEffector) => void;
}
export declare const middleware: IErgoMiddleware;
export declare const dispatch: (action: IAction) => IAction;
export declare const getState: (path?: string | {
    toString: () => string;
}) => any;
export {};

import { IAction } from './transpile';
export declare const gatewayFactory: (__nsp__: string, __path__: string, workers: {
    [x: string]: Function;
}, derive?: {
    [x: string]: PropertyDescriptor;
} | undefined, defaultState?: any) => (rootState: any, action: IAction) => any;

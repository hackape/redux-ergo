import { IAction } from './transpile';
declare type IGatewayReducerFactoryOptions = {
    __nsp__: string;
    __path__: string;
    __params__: undefined | any;
    mode: 'FP' | 'OO';
    methods: {
        [x: string]: Function;
    };
    proto: any;
    derive?: {
        [x: string]: PropertyDescriptor;
    };
    defaultState?: any;
};
export declare const reducerFactory: ({ __nsp__, __path__, __params__, mode, methods, proto, derive, defaultState }: IGatewayReducerFactoryOptions) => (state: any, action: IAction, env?: any) => any;
export {};

import { IAction } from './transpile';
import { TaskRunner } from './task';
interface EnhancedStoreInterface {
    getState(path?: any): any;
    dispatch?(action: IAction): any;
    taskRunner?: TaskRunner;
}
export declare class ServiceGateway {
    store: EnhancedStoreInterface;
    reducers: any[];
    taskRunner: TaskRunner;
    enhancer: (createStore: any) => (reducer: any, initialState: any, enhancer: any) => EnhancedStoreInterface;
    reducer: (rootState: any, action: IAction, ...args: any[]) => any;
    use: (...reducers: any[]) => void;
    unuse: (reducer: any) => boolean;
}
export declare const createServiceGateway: () => ServiceGateway;
export {};

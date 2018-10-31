declare const isEffectUpdateSymbol: unique symbol;
export declare const isEffect: (fn: Function) => boolean;
declare type BabelDescriptor = PropertyDescriptor & {
    initializer?: () => any;
};
export declare function effectDecorator<T>(target: T): T;
export declare function effectDecorator<T>(target: any, prop: string, descriptor: BabelDescriptor): T;
export declare const setState: (value: any) => {
    value: any;
    [isEffectUpdateSymbol]: boolean;
};
export declare const shouldUpdateState: (target: any) => boolean;
export declare function iterateGenerator(gen: Generator, onYielded: ((value: any, stepId: number) => any)): any;
export {};

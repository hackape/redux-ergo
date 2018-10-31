export declare function getByPath(target: any, path?: string): any;
export declare function setByPath(target: any, path: any, value: any): any;
export declare function fillInPathParams(path: string | null, pathParams: any): string;
export declare const validPathRegexp: RegExp;
export declare const isValidPath: (path: string) => boolean;
export declare const hasPathPattern: (path: string) => boolean;
export declare function pathToRegexp(path: any): RegExp;
export declare function comparePath(path1?: string, path2?: string): 1 | 0 | -1;

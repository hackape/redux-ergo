declare type ITask = {
    path: string;
    state: any;
    work: any;
    derive?: any;
};
export declare class TaskRunner {
    constructor(store: any);
    store: any;
    queue: ITask[];
    currentTask?: ITask;
    registerTask(task: ITask): void;
    run(): void;
    cleanup(task: any): void;
}
export {};

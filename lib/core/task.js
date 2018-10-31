"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const proc_1 = require("./proc");
class TaskRunner {
    constructor(store) {
        this.queue = [];
        this.store = store;
    }
    registerTask(task) {
        console.log('registered, ', task);
        this.currentTask = task;
        this.queue.push(task);
    }
    run() {
        console.log('run!');
        const task = this.currentTask;
        if (!task)
            return;
        return proc_1.proc(Object.assign({}, this.store, { task }), task.work, () => this.cleanup(task));
    }
    cleanup(task) {
        const index = this.queue.indexOf(task);
        if (index > -1)
            this.queue.splice(index, 1);
    }
}
exports.TaskRunner = TaskRunner;

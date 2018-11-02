import { proc } from './proc';

type ITask = { path: string; work: any };
export class TaskRunner {
  constructor(store) {
    this.store = store;
  }

  store: any;
  queue: ITask[] = [];
  currentTask?: ITask;

  registerTask(task: ITask) {
    this.currentTask = task;
    this.queue.push(task);
  }

  run() {
    const task = this.currentTask;
    if (!task) return;
    this.currentTask = undefined;
    return setTimeout(() => proc({ ...this.store, task }, task.work, () => this.cleanup(task)), 0);
  }

  cleanup(task) {
    const index = this.queue.indexOf(task);
    if (index > -1) {
      this.queue.splice(index, 1);
      const siblingTask = this.queue.filter(otherTask => otherTask.path === task.path);
      if (siblingTask.length === 0) {
        if (this.store.stateCache && this.store.stateCache.delete) {
          this.store.stateCache.delete(task.path);
        }
      }
    }
  }
}

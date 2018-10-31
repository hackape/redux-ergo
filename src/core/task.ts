import { proc } from './proc';

type ITask = { path: string; state: any; work: any; derive?: any };
export class TaskRunner {
  constructor(store) {
    this.store = store;
  }

  store: any;
  queue: ITask[] = [];
  currentTask?: ITask;

  registerTask(task: ITask) {
    console.log('registered, ', task);
    this.currentTask = task;
    this.queue.push(task);
  }

  run() {
    console.log('run!');
    const task = this.currentTask;
    if (!task) return;
    return proc({ ...this.store, task }, task.work, () => this.cleanup(task));
  }

  cleanup(task) {
    const index = this.queue.indexOf(task);
    if (index > -1) this.queue.splice(index, 1);
  }
}

import { transpile } from 'redux-ergo';
const sleep = ms => {
  return new Promise(res => {
    setTimeout(res, 1000);
  });
};

class TodosManager {
  addTodoSync(text) {
    const todos = this.todos.concat({
      id: this.todos.reduce((maxId, todo) => Math.max(todo.id, maxId), -1) + 1,
      completed: false,
      text
    });
    this.todos = todos;
  }

  *addTodo(text) {
    yield sleep(1000).then(() => {
      console.log('yolo');
      console.log(this);
    });
    yield sleep(1000).then(() => this.addTodoSync(text));
    yield sleep(1000).then(() => this.addTodoSync(text));
  }

  deleteTodo(id) {
    this.todos = this.todos.filter(todo => todo.id !== id);
  }

  completeAllTodos() {
    this.todos.forEach(todo => (todo.completed = true));
  }

  clearCompleted() {
    this.todos = this.todos.filter(todo => todo.completed === false);
  }

  setVisibilityFilter(filter) {
    this.visibilityFilter = filter;
  }
}

export const { reducer, actions } = transpile({
  namespace: 'Todos',
  reducers: {
    addTodoSync(state, text) {
      const todos = state.todos;
      console.log(text);
      const _todos = todos.concat({
        id: todos.reduce((maxId, todo) => Math.max(todo.id, maxId), -1) + 1,
        completed: false,
        text
      });
      return { ...state, todos: _todos };
    },

    *addTodo(state, text) {
      yield sleep(1000).then(() => {
        console.log('yolo');
        console.log(this);
      });
      yield sleep(1000);
      yield 'foo';
      yield sleep(1000).then(() => this.addTodoSync(text));
    },

    deleteTodo(state, id) {
      return { ...state, todos: state.todos.filter(todo => todo.id !== id) };
    },

    completeAllTodos() {
      this.todos.forEach(todo => (todo.completed = true));
    },

    clearCompleted() {
      this.todos = this.todos.filter(todo => todo.completed === false);
    },

    setVisibilityFilter(filter) {
      this.visibilityFilter = filter;
    }
  }
});

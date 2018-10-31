import { transpile } from 'redux-ergo';

const spec = {
  namespace: 'Todo',
  path: '/todos/:id',
  pathParams: { id: Number },

  reducers: {
    editTodo(state, text) {
      return { ...state, text };
    },

    completeTodo(state) {
      return { ...state, completed: !state.completed };
    }
  }
};

export const { reducer, actions } = transpile(spec);

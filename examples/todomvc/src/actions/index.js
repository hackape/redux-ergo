// import * as types from '../constants/ActionTypes'
import { actions } from '../models/todos';
import { actions as todoActions } from '../models/todo';

// export const addTodo = text => ({ type: types.ADD_TODO, text })
export const addTodo = actions.addTodo;
export const deleteTodo = actions.deleteTodo; // id => ({ type: types.DELETE_TODO, id })
export const editTodo = todoActions.editTodo;

export const completeTodo = todoActions.completeTodo;

export const completeAllTodos = actions.completeAllTodos;
export const clearCompleted = actions.clearCompleted;
export const setVisibilityFilter = actions.setVisibilityFilter;

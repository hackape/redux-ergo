import { createServiceGateway } from 'redux-ergo';
import { combineReducers } from 'redux';
import todos from './todos';
import visibilityFilter from './visibilityFilter';
import { reducer as todosReducer } from '../models/todos';
import { reducer as todoReducer } from '../models/todo';

const serviceGateway = createServiceGateway();

const rootReducer = combineReducers({
  todos,
  visibilityFilter
});

serviceGateway.use(rootReducer, todosReducer, todoReducer);

export default serviceGateway;

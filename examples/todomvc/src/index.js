/* @format:disabled */
import React from 'react';
import { render } from 'react-dom';
import { compose, createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import App from './components/App';
import serviceGateway from './reducers';
import 'todomvc-app-css/index.css';

const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const store = createStore(serviceGateway.reducer, composeEnhancers(serviceGateway.enhancer));

render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);

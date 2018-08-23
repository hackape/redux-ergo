# redux-ergo

`redux-ergo` is a utility lib that aims to faciliate working with `redux`. It's all about allowing you to write your everyday-business-logic-code in an ergonomic way. Mind you, like (almost) all things ergonomic, it may look ugly.

The most notable yet heretical feature that `redux-ergo` brings to the table is: one can actually write redux compatible code in object-oriented style. Interested? Let's jump right in!

```js
import { transpile, ergoMiddleware, effect } from 'redux-ergo';
import { createStore, applyMiddleware } from 'redux';

const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout));

class TodosManager {
  static state = {
    todos: [
      {
        text: 'Use Redux',
        completed: false,
        id: 0
      }
    ]
  };

  addTodo(text) {
    const newTodo = {
      id: this.todos.reduce((maxId, todo) => Math.max(todo.id, maxId), -1) + 1,
      completed: false,
      text
    };
    this.todos.push(newTodo);
  }

  async addTodoAfterOneSec(text) {
    await sleep(1000);
    this.addTodo(text);
  }

  deleteTodo(id) {
    this.todos = this.todos.filter(todo => todo.id !== id);
  }

  completeAllTodos() {
    this.todos.forEach(todo => (todo.completed = true));
  }
}

const { actions, reducer } = transpile(TodosManager);

const store = createStore(reducer, applyMiddleware(ergoMiddleware));

store.dispatch(actions.addTodo('hello world!'));
store.dispatch(actions.addTodoAfterOneSec('hello world, again.'));
```

## But how? Isn't it evil to mutate anything at all in `redux`?

Yep, it is. But worry not my friend, under the hood `redux-ergo` uses proxy object (check browser support [here](https://caniuse.com/#feat=proxy)) to do the magic.

It hide the `this` object behind a proxy, so anything you do to that `this` is actually intercepted and pre/post-processed. Thus you get to mutate things without actually mutate anything. Mutations are just tracked internally, and after you finished the function call, an brand new `nextState` is computed and return, just like in good old days.

## What about the side effect / async stuff?

You must've noticed the `addTodoAfterOneSec(text)` out there. That's how you do async stuff. `redux-ergo` doesn't care what you do inside that async function, because it's executed outside the `dispatch -> reducer -> nextState` sync process. The only thing that takes effect is whatever mutation happened to `this`.

Under the hood, `redux-ergo` attach a `.then(callback)` to the promise returned from the async function, which goes like `addTodoAfterOneSec().then(() => redispatch(commitTheChange()))`.

## Doesn't that makes reducer impure?

Correct. That reducer is indeed impure, though I'd argue it's 99% of the time ok. If this bothers you, just a few extra steps can bring the pureness back:

```js
import { transpile, ergoMiddleware, effect } from 'redux-ergo';
// ...

class TodosManager {
  // ...
  @effect
  async addTodoAfterOneSec(text) {
    //...
  }
}

const { actions, reducer, effector } = transpile(TodosManager);
ergoMiddleware.run(effector);

// ...
```

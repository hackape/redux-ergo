# redux-ergo

## Introduction

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

### But how? Isn't it evil to mutate anything at all in `redux`?

Yep, it is. But worry not my friend, under the hood `redux-ergo` uses proxy object (check browser support [here](https://caniuse.com/#feat=proxy)) to do the magic.

It hide the `this` object behind a proxy, so anything you do to that `this` is actually intercepted and pre/post-processed. Thus you get to mutate things without actually mutate anything. Mutations are just tracked internally, and after you finished the function call, an brand new `nextState` is computed and return.

### What about the side effect / async stuff?

You must've noticed the `addTodoAfterOneSec(text)` out there. That's how you do async stuff. `redux-ergo` doesn't care what you do inside that async function, because it's executed outside the `dispatch -> reducer -> nextState` sync process. The only thing that takes effect is whatever mutation happened to `this`.

Under the hood, `redux-ergo` attach a `.then(callback)` to the promise returned from the async function, which goes like `addTodoAfterOneSec().then(() => redispatch(commitTheChange()))`.

### Doesn't that makes reducer impure?

Correct. That reducer is indeed impure, though I'd argue it's 99% of the time OK. If this bothers you, just a few extra steps can bring back the pureness:

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

Now all side effects are bundled into `effector` and handled inside `ergoMiddleware`, your `reducer` remains pure.

## Usage

The core API of `redux-ergo` is the `transpile(spec)` function. It accepts a "spec" as param that describe your intention, then "warps" it and return a suite of `{ actions, reducer, effector }` that meet Redux's API requirement. Such process is alot like transpiling (thus the name), in the sense that you write your code in an expressive way, but this code is not executable upfront until you pass it through a transpiler to get an executable version.

`transpile()` accept two styles of spec

1. The ES Class style

As is demonstrated above, the extact interface goes like:

```typescript
interface ESClassSpec {
  namespace?: string;
  path?: string;
  pathParams?: { [paramKey: string]: string | number };
  defaultState?: any;
  new (): any;
}
```

2. The plain object style:

```typescript
interface PlainObjectSpec {
  namespace?: string;
  path?: string;
  pathParams?: { [paramKey: string]: string | number };
  defaultState?: any;
  reducers: { [methodName: string]: () };
  effects?: { [methodName: string]: Function };
}
```

_(Here we encounter some new concepts, "namespace" and "path". We'll get back to them later.)_

Inside `transpile(spec)` function these two styles correspond to two mode: "OO" (Object Oriented) mode and "FP" (Functional Programming) mode, and are handled differently.

### OO mode

If `typeof spec === 'function'`, you opt to OO mode.

You MUST specify your reducers/effectors as the class' methods, they MUST be own properties of `spec.prototype`. As of `namespace`, `path` and `pathParams`, these 3 MUST be static property of the class. Class constructor is completely ignored.

Example:

```js
const spec = class Product {
  static path = '/shoppingCart/productsById/:id';
  static pathParams = { id: String };
  static namespace = 'product';

  static defaultState = {
    price: 0,
    uuid: ''
  };

  updatePrice(price) {
    this.price = price;
  }

  @effect
  async fetchUUID(productName) {
    await request(`/api/uuid?productName=${productName}`).then(res => {
      this.uuid = res.data;
    });
  }
};
```

### FP mode

If `typeof spec === 'object' && typeof spec.reducers === 'object'`, you opt to FP mode.

Let's see example first:

```js
const spec = {
  path: '/shoppingCart/productsById/:id',
  pathParams: { id: String },
  namespace: 'product',
  defaultState: {
    price: 0,
    uuid: ''
  },
  reducers: {
    updatePrice(prevState, price) {
      return { ...prevState, price };
    }
  },
  effects: {
    async fetchUUID(prevState, productName) {
      await request(`/api/uuid?productName=${productName}`).then(res => {
        const uuid = res.data;
        return setState({ ...prevState, uuid });
      });
    }
  }
};
```

In FP mode, "reducers" are specified akin to vanilla redux reducer, first argument is always the plain old `prevState`, but the rest args are `...action.payload` spreaded, no magic here. You MUST explicitly return the `nextState` from the reducer.

As of "effects", it can be whatever function you desire. But if you want to commit change to the `state` you must explitcitly return the `setState(nextState)`. Internally `setState()` produces a special action message, which then get re-dispatched. It'll notify a hidden reducer that correspond to that "effect", that reducer does the commit and update state work.

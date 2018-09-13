# redux-ergo

`redux-ergo` is a utility lib that aims to faciliate working with `redux`. It's all about allowing you to write your everyday-business-logic-code in an ergonomic way. Mind you, like (almost) all things ergonomic, it may look ugly.

## Quick Start Guide

```js
import { createStore, applyMiddleware } from 'redux';
import { transpile, ergoMiddleware } from 'redux-ergo';

// Functional Programming vs Object Oriented?
// Why not both!

const FP = transpile({
  defaultState: {
    todos: [{ text: 'Redux Todo', done: false }]
  },

  reducers: {
    addTodo(prevState, text) {
      return { ...prevState, todos: prevState.todos.concat({ text, done: false }) };
    }
  }
});

const OO = transpile(
  class Todo {
    static defaultState = {
      todos: [{ text: 'Redux Todo', done: false }]
    };

    addTodo(text) {
      this.todos.push({ text, done: false });
    }
  }
);

// These two are effectively equivalent
const randomPick = (a, b) => (Math.round(Math.random()) ? a : b);
const todosModel = randomPick(FP, OO);

const store = createStore(todosModel.reducer, applyMiddleware(ergoMiddleware));
ergoMiddleware.run(todosModel.effector);
store.dispatch(todosModel.actions.addTodo('buy milk'));
```

## Slow Start Guide

The core API of `redux-ergo` is the `transpile(spec)` function.

It accepts a `spec` as first arugment that describe your intention, then "warps" it and return a suite of `{ actions, reducer, effector }` that meet Redux's API requirement.

```js
const { actions, reducer, effector } = transpile(spec);
```

This process is alot like _transpile_ (thus the name), in the sense that you write your code in an expressive way, yet this code is not executable upfront until you pass it through a transpiler to get an executable version.

### Integration with Redux

The `{ reducer, actions, effector }` suite contains everything you need to integrate with `redux`.

`reducer` is a _root reducer_, you can just pass it to `createStore()`, If you got multiple reducers, you can use `composeReducers()` util function to compose them.

```js
import { composeReducers } from 'redux-ergo';

import todosModel from './models/todos';
import filterModel from './models/filter';

const finalRootReducer = composeReducers(todosModel.reducer, filterModel.reducer);
const store = createStore(finalRootReducer /*...*/);
```

`actions` is a plain object containing all the _action creators_ corresponding to your _reducers methods_. It's automatically generated based on your `reducers` and `pathParams` spec params in `spec`.

```js
const todoModels = transpile({
  reducers: {
    addTodo(prevState, text) {
      return { ...prevState, todos: prevState.todos.concat({ text, done: false }) };
    },

    removeDone(prevState) {
      return { ...prevState, todos: prevState.todos.filter(todo => !todo.done) };
    }
  }
});

store.dispatch(todoModels.actions.addTodo('buy milk'));
store.dispatch(todoModels.actions.removeDone());
```

`effector` is where your side effects code lives, typically async code. As per `redux` official, sides effects should be handled by middleware. `redux-ergo` provide a singleton `ergoMiddleware` to do the job.

Because it's a singleton, the order you invoke `ergoMiddleware.run()` and `applyMiddleware(ergoMiddleware)` doesn't matter.

```js
import { ergoMiddleware } from 'redux-ergo';

ergoMiddleware.run(effectorA);
const store = createStore(reducer, applyMiddleware(ergoMiddleware));
ergoMiddleware.run(effectorB);
// or ergoMiddleware.run(effectorA, effectorB)
```

### Spec: Two Styles, Two Modes

`transpile(spec)` accepts two styles of `spec` that correspond to two mode:

1. Plain object style, corresponds to **FP mode** (Functional Programming Mode)
2. ES class style, corresponds to **OO mode** (Object Oriented Mode)

So `spec` is either a plain object or an ES class (a function with a prototype). These two styles are handled quite differently inside `transpile()`, but both contain the same set of spec params, explicitly or implicitly:

- `namespace`
- `path`
- `pathParams`
- `reducers`
- `effects`

We'll explain these concepts later, let's see some examples first.

Note that, the spec style (mode) you choose does not affect integration with `redux`. After passed to `transpile()`, both return the same suite of `{ reducer, actions, effector }` and behave exactly the same.

Below is the same piece of logical intension expressed in two different styles of spec.

#### The FP mode

If `typeof spec === 'object'`, you opt to FP mode.

```js
const spec = {
  namespace: 'product',
  path: '/shoppingCart/productsById/:id',
  pathParams: { id: String },

  defaultState: {
    price: 0,
    currency: '$',
    uuid: ''
  },

  reducers: {
    updatePrice(prevState, price, currency) {
      return { ...prevState, price, currency };
    }
  },

  effects: {
    async fetchUUID(prevState, productName) {
      await request(`/api/uuid?productName=${productName}`).then(res => {
        return setState({ ...prevState, uuid: res.data });
      });
    }
  }
};
```

In FP mode, reducers are specified akin to vanilla redux reducer, first argument is always the plain old `prevState`, and you MUST explicitly return the `nextState`.

You must've noticed the second argument is not `action`. This is a simple convention adopted by `redux-ergo`, see how internal works in pseudo code:

```js
const gatewayReducer = (prevState, action) => {
  const methodName = getMethodName(action.type);
  return reducers[methodName](prevState, ...action.payload);
};
```

#### The OO mode

If `typeof spec === 'function'`, you opt to OO mode.

```js
import { effect } from 'redux-ergo';

const spec = class Product {
  static namespace = 'product';
  static path = '/shoppingCart/productsById/:id';
  static pathParams = { id: String };

  static defaultState = {
    price: 0,
    currency: '$',
    uuid: ''
  };

  updatePrice(price, currency) {
    this.price = price;
    this.currency = currency;
  }

  @effect
  async fetchUUID(productName) {
    await request(`/api/uuid?productName=${productName}`).then(res => {
      this.uuid = res.data;
    });
  }
};
```

OO mode is really the most interesting feature `redux-ergo` brings to the table. Though `redux` is designed around FP paradigm, sometimes it just feels more natural to express certain logic in OO paradigm, especially one that deals with _entity_.

Thanks to the flexibility of JavaScript, `redux-ergo` find a way to **mimic** the behavior of OO paradigm code. In reality, the ES class is **never** instantiated, so `constructor()` is useless, thus instance's own properties are useless too.

This is why you MUST specify your reducers and effects as the class' methods, in other word, they MUST be own properties of `spec.prototype`. Effects are just methods annotated by `@effect`. As of `namespace`, `path`, `pathParams` and `defaultState`, these MUST be static properties of the class.

The `prevState` presents itself as the `this` keyword. Thus, you should NEVER speficy any method using fat arrow notation `() => {}`.

Again, check the pseudo code explanation:

```js
import { asMutable, getValue } from 'as-mutable';

const gatewayReducer = (prevState, action) => {
  const methodName = getMethodName(action.type);
  const mutableState = asMutable(prevState);
  spec.prototype[methodName].call(mutableState, ...action.payload);
  return getValue(mutableState);
};
```

The `as-mutable` lib is playing a big role here, it does the magic by leveraging the ES Proxy API. This is why you get to "mutate" the `this` object while leaving `prevState` untouched.

## Concepts and Spec Params

`redux` is a lot like RPC. You dispatch an _action_, which is nothing more than a signal message, then the listening _reducer_ on the other side does the actual heavy lifting based on the message's content. Typically `action.type` locates a piece of code inside reducer, and `action.payload` provides the necessary context variables to execute that code.

`redux-ergo` develops on that idea, adds in a few new concepts.

### 1. Gateway Reducer, Working Reducer and `spec.reducers`

The `reducers`, whether provided explicitly as `spec.reducers` object in FP mode or all the methods defined in `spec.prototype` in OO mode, are _working reducers_. During `model = transpile(spec)` they are grouped up and wrapped into a single _gateway reducer_, then returned as `model.reducer`. This mechanism provides a chance to pre- or post-process action and state.

### 2. Path Finder and `spec.path`

Given the fact that `redux` manages state as a state tree, we can use a string tree path to locate a slice of state that relates to a particular piece of domain code.

`redux-ergo` has an internal _path finder_ inside gateway reducer. On receiving an `action`, it reads the _path part_ in `action.type` (will explain later), based on that info it slices out a tree node as `localState`, and passes it down to the actual working reducer.

After the working reducer finish its job and return a `nextLocalState`, the _path finder_ re-attaches the the local state tree node back to the root state tree, produces the `nextRootState` to return from gateway reducer.

```js
// To achieve the same effect of the `combineReducers()` pattern
const rootReducer = combineReducers({ domainA: sliceReducerA, domainB: sliceReducerB })

// you do:
import { transpile, composeReducers } from 'redux-ergo'
const { reducer: sliceReducerA } = transpile({
  path: '/domainA'
  reducers: {
    [someMethod]: (localState /* rootState.domainA */,  ...args) => nextLocalState
  }
})

const { reducer: sliceReducerB } = transpile({
  path: '/domainB'
  // ...
})

const rootReducer = composeReducers(sliceReducerA, sliceReducerB)
```

### 3. Dynamic Path and `spec.pathParams`

`path` can be specified as as _path pattern_, e.g. `path: '/books/:id'`. This make it a _dynamic path_, in this case `pathParams` is also required. It's a plain object of shape like `{ id: types.string | types.number }`.

Typical usage of dynamic path is to locate an entity inside a collection. `pathParams` tells `redux-ergo` whether the internal selector should treat the parent node as a plain object or an array.

When `pathParams` are provided, it also affect the produced action creators' arguments position. `actions.someActionCreator(pathParams, ...args)` will always take the first argument as the `pathParams`.

```js
import { transpile, types } from 'redux-ergo';
const { actions } = transpile({
  path: '/shoppingCart/productsById/:id',
  pathParams: { id: types.string },
  reducers: {
    updatePrice(prevState, price, currency) {
      return { ...prevState, price, currency };
    }
  }
});

store.dispatch(actions.updatePrice({ id: '3' }, price, currency));
```

### 4. `spec.namespace`

On receiving `action`, the gateway reducer reads the _namespace part_ from `action.type`, and match against its own namespace. If the match fails, it simply return early. Note that unlike some other libs (e.g. `dvajs`), `namespace` in `redux-ergo` has no effect on locating a sliced state -- that's the job of `path` and `pathParams` -- it's solely for avoiding working reducer name collision.

### 5. Auto Gen-ed Action Creator's return `action.type`

Now that we've introduced the concepts of `working reducer`, `path` and `namespace`, it's time to reveal `action.type`'s pattern.

`action.type` is composed of three parts: _namespace part_, _path part_ and _method name part_, in that order.

```js
action.type === 'namespace/grandParentNode/parentNode/id/methodName';
```

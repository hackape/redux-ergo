function co(gen, onYielded) {
  var stepId = 0;
  var done = false;
  return new Promise((resolve, reject) => {
    function onFulfilled(res) {
      try {
        next(gen.next(res));
      } catch (e) {
        return reject(e);
      }
    }

    function onRejected(err) {
      try {
        next(gen.throw(err));
      } catch (e) {
        return reject(e);
      }
    }

    function next(ret) {
      stepId++;
      if (done) return resolve();
      if (ret.done) done = true;

      if (ret.value && typeof ret.value.then === 'function') {
        return Promise.resolve(ret.value).then(onFulfilled, onRejected);
      } else {
        onYielded(ret, stepId);
        //onFulfilled(ret.value);
        return Promise.resolve(ret.value).then(onFulfilled, onRejected);
      }
    }

    onFulfilled();
  });
}

function* foo() {
  yield new Promise(resolve => {
    setTimeout(() => resolve({ do: 0 }), 0);
  }).then(console.log);
  yield Promise.resolve({ do: 1 }).then(console.log);
  yield { do: 2 };
  yield { do: 3 };
  return { do: 4 };
}

co(foo(), (value, step) => {
  console.log(`[step ${step}]`, value);
}).catch(err => {
  console.log('shit happend', err);
});

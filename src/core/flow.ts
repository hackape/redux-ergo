import { isIterator, isFunction } from '../utils/is';

type IGenerator<R> = IterableIterator<R>;
type IGeneratorFunction<A extends any[], R> = (...args: A) => IterableIterator<R>;

export function flow<R>(
  gen: IGenerator<R>,
  onYielded?: ((value: any, stepId: number) => any)
): Promise<R>;
export function flow<A extends any[], R>(
  gen: IGeneratorFunction<A, R>,
  onYielded?: ((value: any, stepId: number) => any)
): (...args: A) => Promise<R>;
export function flow(gen: any, onYielded?: ((value: any, stepId: number) => any)): any {
  const runFlow = (gen: Generator, onYielded: any) => {
    // only handle generator, else just return;
    if (!isIterator(gen)) return gen;

    const promise = new Promise(function(resolve, reject) {
      function onFulfilled(res: any) {
        try {
          next(gen.next(res));
        } catch (e) {
          return reject(e);
        }
      }

      function onRejected(err: any) {
        try {
          next(gen.throw!(err));
        } catch (e) {
          return reject(e);
        }
      }

      let stepId = 0;
      function next(iter: IteratorResult<any>) {
        // ret is an async iterator
        if (typeof (iter as any).then === 'function') {
          throw '[redux-ergo] Async generator function is not supported yet.';
        }

        if (isFunction(onYielded)) {
          onYielded(iter, stepId++);
        }

        if (iter.done) return resolve(iter.value);

        return Promise.resolve(runFlow(iter.value, onYielded)).then(onFulfilled, onRejected);
      }

      onFulfilled(undefined); // kick off the process

      return promise;
    });
  };

  if (isFunction(gen)) {
    return function(...args) {
      try {
        const _gen = gen(...args);
        return isIterator(_gen) ? runFlow(_gen, onYielded) : Promise.resolve(_gen);
      } catch (err) {
        return Promise.reject(err);
      }
    };
  } else if (isIterator(gen)) {
    return runFlow(gen, onYielded);
  } else {
    return Promise.resolve(gen);
  }
}

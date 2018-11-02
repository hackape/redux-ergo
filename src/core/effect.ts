import { getByPath } from './path';
import { isFunction } from '../utils/is';

type IEffect = {
  type: string;
  payload: any;
};

export const select = (selector: any = '', ...args) => {
  if (typeof selector === 'string') {
    args = [selector];
    selector = getByPath;
  }

  if (isFunction(selector)) {
    return {
      type: 'SELECT',
      payload: {
        selector,
        args
      }
    };
  }
};

export function update(updater: Function): IEffect;
export function update(path: string, updater: Function): IEffect;
export function update(path: any, updater?: any) {
  if (isFunction(path) && updater === undefined) {
    updater = path;
    path = undefined;
  }

  return {
    type: 'UPDATE',
    payload: { path, updater }
  };
}

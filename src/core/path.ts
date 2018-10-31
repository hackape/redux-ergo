import { isPlainObject } from '../utils/is';

export function getByPath(target, path = '') {
  const tempContext = {
    '': target
  };
  const pathComps = path.split('/');
  return pathComps.reduce((acc, comp) => {
    try {
      return acc[comp];
    } catch (err) {
      return undefined;
    }
  }, tempContext);
}

export function setByPath(target, path, value) {
  const tempContext = {
    '': target
  };
  if (path === null) return target;
  if (path === '/') path = '';
  const pathComps = path.split('/');
  const lastIndex = pathComps.length - 1;
  pathComps.reduce((acc, comp, index) => {
    if (!isPlainObject(acc) && !Array.isArray(acc)) {
      throw Error(
        'setByPath: encounter an intermediate node that is neither plain object nor array'
      );
    }
    if (index === lastIndex) {
      acc[comp] = value;
    } else {
      let container = acc[comp];
      if (container === undefined) {
        container = Number.isInteger(Number(comp)) ? [] : {};
      } else {
        container = Array.isArray(container) ? [...container] : { ...container };
      }
      acc[comp] = container;
      return acc[comp];
    }
  }, tempContext);
  return tempContext[''];
}

export function fillInPathParams(path: string | null, pathParams: any) {
  if (typeof path !== 'string' || typeof pathParams !== 'object') {
    throw Error('Invalid path or pathParams');
  }

  const pathComps = path.split('/');
  return pathComps
    .map(pathComp => {
      if (pathComp[0] !== ':') return pathComp;

      const pathParamValue = pathParams[pathComp.slice(1)];
      if (pathParamValue === undefined) {
        throw Error(`Missing path params "${pathComp}"`);
      } else {
        return String(pathParamValue);
      }
    })
    .join('/');
}

export const validPathRegexp = /^(?:(\/:[^\/ ]+)|(?:\/[^:][^\/]*)){0,}\/?$/;
export const isValidPath = (path: string) => validPathRegexp.test(path);
export const hasPathPattern = (path: string) => /\/\:[^\/]+/.test(path);

export function pathToRegexp(path) {
  const reStrComps = path
    .split('/')
    .map(pathComp => (pathComp[0] === ':' ? '(?:([^/]+?))' : pathComp));

  return new RegExp('^' + reStrComps.join('/') + '$');
}

// path with smaller length comes first
// path without pathParam comes first
// path with deeper pathParam comes first
export function comparePath(path1 = '', path2 = '') {
  const p1 = path1.split('/').slice(1);
  const p2 = path2.split('/').slice(1);

  if (p1.length < p2.length) return -1;
  if (p1.length > p2.length) return 1;

  if (hasPathPattern(path1) && !hasPathPattern(path2)) {
    return 1;
  } else if (!hasPathPattern(path1) && hasPathPattern(path2)) {
    return -1;
  }

  for (let i = 0; i < p1.length; i++) {
    const c1 = p1[i];
    const c2 = p2[i];
    if (c1[0] === ':' && c2[0] === ':') {
      continue;
    } else if (c1[0] === ':') {
      return 1;
    } else if (c2[0] === ':') {
      return -1;
    }

    if (c1.length < c2.length) return -1;
    if (c1.length > c2.length) return 1;
    if (c1 === c2) continue;

    // length equal, resort to alphabetical order:
    const c = [c1, c2].sort()[0];
    if (c1 === c) return -1;
    return 1;
  }

  return 0;
}

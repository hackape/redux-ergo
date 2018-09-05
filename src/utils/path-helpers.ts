import { isPlainObject } from './is';

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
    let container = acc[comp];
    if (index !== lastIndex) {
      if (container === undefined) {
        container = Number.isInteger(Number(comp)) ? [] : {};
      } else {
        container = Array.isArray(container) ? [...container] : { ...container };
      }
      acc[comp] = container;
      return acc[comp];
    } else {
      acc[comp] = value;
    }
  }, tempContext);
  return tempContext[''];
}

export const fillInPathParams = (path: string | null, pathParams: any) => {
  try {
    if (typeof path !== 'string' || typeof pathParams !== 'object') {
      throw Error('Invalid path input');
    }

    const pathComps = path.split('/');
    return pathComps
      .map(pathComp => {
        if (pathComp[0] === ':') {
          const pathParamValue = pathParams[pathComp.slice(1)];
          if (pathParamValue === undefined) {
            throw Error(`Missing path params ${pathComp}`);
          } else {
            return pathParamValue;
          }
        } else {
          return pathComp;
        }
      })
      .join('/');
  } catch (err) {
    console && console.error && console.error(err);
    return null;
  }
};

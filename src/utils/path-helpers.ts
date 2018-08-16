export function getByPath(target, path = '') {
  const tempContext = {
    '': target
  };
  const pathComps = path.split('/');
  return pathComps.reduce((acc, comp) => {
    return acc[comp];
  }, tempContext);
}

export function setByPath(target, path, value) {
  const tempContext = {
    '': target
  };
  const pathComps = path.split('/');
  const lastIndex = pathComps.length - 1;
  pathComps.reduce((acc, comp, index) => {
    const container = acc[comp];
    if (index !== lastIndex) {
      acc[comp] = Array.isArray(container) ? [...container] : { ...container };
      return acc[comp];
    } else {
      acc[comp] = value;
    }
  }, tempContext);
  return tempContext[''];
}

export const fillInPathParams = (path: string, pathParams: any) => {
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
      }
    })
    .join('/');
};

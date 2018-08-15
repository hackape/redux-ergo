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

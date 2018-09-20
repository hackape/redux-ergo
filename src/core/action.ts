export function parseAction(action): { namespace: string; path: string; method: string } | null {
  // 1. validate `action.type` matches the "namespace/path/method" pattern
  if (!action || typeof action.type !== 'string') return null;
  const matched = (action.type as string).match(/^([^\/]*)((?:\/[^\/]+)*)\/([^\/]+)$/);
  if (!matched) return null;

  // 2. validate `path` and `namespace` match spec
  const [namespace, path, method] = matched.slice(1);
  return { namespace, path, method };
}

export function finalizeActionFactory(action) {
  const finalizeAction = {
    type: action.type,
    meta: { finalize: true } as any
  };

  return payload => ({ ...finalizeAction, payload });
}

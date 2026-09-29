import type { MapNode } from './data';
import { createEmptyMap } from './helpers';
import { nodesReducer, type NodeAction } from './nodesReducer';

const KEY = 'nodesHistory';
type History = { schema: 1; base: MapNode[]; log: NodeAction[] };

function isHistory(value: unknown): value is History {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('schema' in value) ||
    !('base' in value) ||
    !('log' in value)
  ) {
    return false;
  }

  return (
    value.schema === 1 && Array.isArray(value.base) && Array.isArray(value.log)
  );
}

let history: History = {
  schema: 1,
  base: createEmptyMap(),
  log: [],
};

function updateStorage() {
  localStorage.setItem(KEY, JSON.stringify(history));
}

export function saveAction(action: NodeAction) {
  history.log.push(action);
  updateStorage();
}

export function getInitialState() {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    updateStorage();
    return history.base;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isHistory(parsed)) {
      history = parsed;
      return parsed.log.reduce(nodesReducer, parsed.base);
    } else {
      throw new Error('Corrupt history');
    }
  } catch (error) {
    console.error(error);
    localStorage.setItem(KEY + ':corrupt', raw);
    return resetHistoryTo(createEmptyMap());
  }
}

export function resetHistoryTo(nodes: MapNode[]) {
  history = {
    schema: 1,
    base: nodes,
    log: [],
  };
  updateStorage();
  return nodes;
}

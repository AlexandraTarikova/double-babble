import type { MapNode } from './data';

export function createNode(): MapNode {
  return {
    id: crypto.randomUUID(),
    title: '',
    level: 0,
    words: {
      nouns: [],
      verbs: [],
      adjectives: [],
    },
    parentId: null,
    innerNodeIds: [],
    linkIds: {
      N: null,
      E: null,
      S: null,
      W: null,
    },
  };
}

export function createEmptyMap() {
  return [createNode()];
}

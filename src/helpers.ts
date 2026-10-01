import {
  WordGroups,
  type Language,
  type MapNode,
  type WordGroupsType,
} from './data';

export function createNode(): MapNode {
  return {
    id: crypto.randomUUID(),
    title: '',
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

export const REQUIRED_WORDS_PER_LEVEL: Record<WordGroupsType, number> = {
  nouns: 5,
  verbs: 2,
  adjectives: 2,
};

export function getNodeLevel(node: MapNode) {
  return Math.floor(
    Math.min(
      ...typedKeys(WordGroups).map(
        (group) => node.words[group].length / REQUIRED_WORDS_PER_LEVEL[group],
      ),
    ),
  );
}

export function createEmptyMap() {
  return [createNode()];
}

export function typedKeys<T extends object>(object: T) {
  return Object.keys(object) as Extract<keyof T, string>[];
}

export function typedEntries<T extends Record<string, unknown>>(obj: T) {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}

export function getWordKey({
  word,
  group,
  from,
  to,
}: {
  word: string;
  group: WordGroupsType;
  from: Language;
  to: Language;
}) {
  return `${group}__from-${from}-to-${to}__${word}`;
}

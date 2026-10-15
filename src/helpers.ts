import {
  WordGroups,
  type Language,
  type MapNode,
  type WordGroupsType,
} from './data';

export function createId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(
    '',
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createNode(outerNodeId?: string): MapNode {
  return {
    id: createId(),
    title: '',
    words: {
      nouns: [],
      verbs: [],
      adjectives: [],
    },
    outerNodeId: outerNodeId ?? null,
    linkIds: {
      N: null,
      E: null,
      S: null,
      W: null,
    },
  };
}

export const REQUIRED_WORDS_PER_LEVEL: Record<WordGroupsType, number> = {
  nouns: 2,
  verbs: 1,
  adjectives: 1,
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
  wordFrom,
  wordTo,
  group,
  from,
  to,
}: {
  wordFrom: string;
  wordTo: string;
  group: WordGroupsType;
  from: Language;
  to: Language;
}) {
  return `${group}__${wordFrom}__from-${from}-to-${to}__${wordTo}`;
}

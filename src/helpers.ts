import {
  LinkDirections,
  WordGroups,
  type Language,
  type LinkDirectionType,
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

export const oppositeDirections: Record<LinkDirectionType, LinkDirectionType> =
  {
    N: 'S',
    E: 'W',
    S: 'N',
    W: 'E',
  };

const directionShift: Record<LinkDirectionType, { x: number; y: number }> = {
  N: { x: 0, y: 1 },
  E: { x: -1, y: 0 },
  S: { x: 0, y: -1 },
  W: { x: 1, y: 0 },
};

export const calculateAllPositions = (
  nodes: MapNode[],
  startNode: MapNode | null | undefined,
): Record<string, { x: number | null; y: number | null }> => {
  const positions: Record<string, { x: number | null; y: number | null }> =
    Object.fromEntries(nodes.map((n) => [n.id, { x: null, y: null }]));
  const walk = (
    currentNode: MapNode | null | undefined,
    directionProp: LinkDirectionType | 'start',
  ) => {
    if (
      !currentNode ||
      (positions[currentNode.id]?.x !== null && directionProp !== 'start')
    ) {
      return;
    }

    if (directionProp === 'start') {
      positions[currentNode.id] = { x: 0, y: 0 };
    } else if (currentNode.linkIds[directionProp]) {
      const parentId = currentNode.linkIds[directionProp];
      const parentPosition = positions[parentId];

      if (parentPosition?.x !== null && parentPosition?.y !== null) {
        positions[currentNode.id] = {
          x: parentPosition.x + directionShift[directionProp].x,
          y: parentPosition.y + directionShift[directionProp].y,
        };
      }
    }

    //looping through links of current node, excluding the directionwe came from
    LinkDirections.forEach((direction) => {
      const nextNodeId = currentNode.linkIds[direction];
      if (direction !== directionProp && nextNodeId) {
        const nextNode = nodes.find((node) => node.id === nextNodeId);
        walk(nextNode, oppositeDirections[direction]);
      }
    });
  };

  walk(startNode, 'start');

  return positions;
};

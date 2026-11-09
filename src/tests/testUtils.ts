import type { MapNode, Word, WordGroupsType } from '../data';
import { createNode, REQUIRED_WORDS_PER_LEVEL } from '../helpers';

export const word = (): Word => ({
  translations: { english: '', swedish: '', french: '' },
  examples: {},
});

export function nodeWithWords(counts: Record<WordGroupsType, number>): MapNode {
  return {
    ...createNode(),
    words: {
      nouns: Array.from({ length: counts.nouns }, word),
      verbs: Array.from({ length: counts.verbs }, word),
      adjectives: Array.from({ length: counts.adjectives }, word),
    },
  };
}

export const wordSet: Record<WordGroupsType, Word[]> = {
  nouns: [word()],
  verbs: [word()],
  adjectives: [word()],
};

export const nodeFull = nodeWithWords(REQUIRED_WORDS_PER_LEVEL);

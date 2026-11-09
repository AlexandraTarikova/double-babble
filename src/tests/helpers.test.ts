import { describe, expect, test } from 'vitest';

import { getNodeLevel, createNode, REQUIRED_WORDS_PER_LEVEL } from '../helpers';
import { nodeFull, nodeWithWords } from './testUtils';

describe('getNodeLevel', () => {
  test('Empty node', () => {
    expect(getNodeLevel(createNode())).toBe(0);
  });

  test('10 verbs and adj, 0 nouns', () => {
    expect(
      getNodeLevel(nodeWithWords({ nouns: 0, adjectives: 10, verbs: 10 })),
    ).toBe(0);
  });

  test('1 missing noun for 0 -> 1 level', () => {
    expect(
      getNodeLevel(
        nodeWithWords({
          ...REQUIRED_WORDS_PER_LEVEL,
          nouns: REQUIRED_WORDS_PER_LEVEL.nouns - 1,
        }),
      ),
    ).toBe(0);
  });

  test('Exactly 0 -> 1 level requirements', () => {
    expect(getNodeLevel(nodeFull)).toBe(1);
  });

  test('0 -> 1 level requirements + 1 noun', () => {
    expect(
      getNodeLevel(
        nodeWithWords({
          ...REQUIRED_WORDS_PER_LEVEL,
          nouns: REQUIRED_WORDS_PER_LEVEL.nouns + 1,
        }),
      ),
    ).toBe(1);
  });
});

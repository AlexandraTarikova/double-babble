import { describe, expect, test } from 'vitest';
import { nodesReducer } from '../nodesReducer';
import { NODES_DEMO } from '../nodesDemo';
import { nodeFull, wordSet } from './testUtils';

describe('nodesReducer [delete]', () => {
  test('non-existing node', () => {
    expect(
      nodesReducer(NODES_DEMO, { type: 'delete', payload: 'non-existing-id' }),
    ).toStrictEqual(NODES_DEMO);
  });

  test('existing node', () => {
    expect(
      nodesReducer(NODES_DEMO, { type: 'delete', payload: 'castle' }),
    ).toStrictEqual(
      NODES_DEMO.filter((node) => node.id !== 'castle').map((node) =>
        node.id === 'road'
          ? { ...node, linkIds: { ...node.linkIds, N: null } }
          : node,
      ),
    );
  });

  test.todo('refuses a middle node');
  test.todo('refuses a node with inner nodes');
});

describe('nodesReducer [set]', () => {
  test('to demo', () => {
    expect(
      nodesReducer([], { type: 'set', payload: NODES_DEMO }),
    ).toStrictEqual(NODES_DEMO);
  });
  test('clear map', () => {
    expect(
      nodesReducer(NODES_DEMO, { type: 'set', payload: [] }),
    ).toStrictEqual([]);
  });
});

describe('nodesReducer [addNode]', () => {
  test('valid case', () => {
    expect(
      nodesReducer(NODES_DEMO, {
        type: 'addNode',
        payload: {
          node: nodeFull,
          targetNodeId: 'castle',
          direction: 'N',
        },
      }),
    ).toStrictEqual([
      ...NODES_DEMO.map((node) =>
        node.id === 'castle'
          ? { ...node, linkIds: { ...node.linkIds, N: nodeFull.id } }
          : node,
      ),
      { ...nodeFull, linkIds: { ...nodeFull.linkIds, S: 'castle' } },
    ]);
  });
  test('non-existing target', () => {
    expect(
      nodesReducer(NODES_DEMO, {
        type: 'addNode',
        payload: {
          node: nodeFull,
          targetNodeId: 'non-existing-id',
          direction: 'N',
        },
      }),
    ).toStrictEqual(NODES_DEMO);
  });
  test.todo("refuses if new node's id is in use already");
  test.todo("refuses if new node's outerNodeId differs from the target's");
  test.todo('refuses if new node is invalid');
  test.todo('refuses if direction is invalid');
  test.todo('refuses if direction is occupied');
  test.todo('refuses if next branching breakpoint is not met');
});

describe('nodesReducer [edit]', () => {
  test('existing target', () => {
    expect(
      nodesReducer(NODES_DEMO, {
        type: 'edit',
        payload: {
          id: 'castle',
          changes: { title: 'Boop' },
        },
      }),
    ).toStrictEqual(
      NODES_DEMO.map((node) =>
        node.id === 'castle' ? { ...node, title: 'Boop' } : node,
      ),
    );
  });
  test('non-existing target', () => {
    expect(
      nodesReducer(NODES_DEMO, {
        type: 'edit',
        payload: {
          id: 'non-existing-id',
          changes: { title: 'Boop' },
        },
      }),
    ).toStrictEqual(NODES_DEMO);
  });
  test.todo('word list edit');
});

describe('nodesReducer [addWords]', () => {
  test('+1 word to each category', () => {
    expect(
      nodesReducer(NODES_DEMO, {
        type: 'addWords',
        payload: {
          targetNodeId: 'castle',
          words: wordSet,
        },
      }),
    ).toStrictEqual(
      NODES_DEMO.map((node) =>
        node.id === 'castle'
          ? {
              ...node,
              words: {
                nouns: [...node.words.nouns, ...wordSet.nouns],
                verbs: [...node.words.verbs, ...wordSet.verbs],
                adjectives: [...node.words.adjectives, ...wordSet.adjectives],
              },
            }
          : node,
      ),
    );
  });
  test('non-existing target', () => {
    expect(
      nodesReducer(NODES_DEMO, {
        type: 'addWords',
        payload: {
          targetNodeId: 'non-existing-id',
          words: wordSet,
        },
      }),
    ).toStrictEqual(NODES_DEMO);
  });
  test.todo('refuses if word misses translation');
});

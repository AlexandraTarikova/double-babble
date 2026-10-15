import type {
  LinkDirectionType,
  LinkIdsType,
  MapNode,
  WordGroupsType,
  Word,
} from './data';
import { LinkDirections, WordGroups } from './data';
import { oppositeDirections, typedKeys } from './helpers';

const unlinkTargetNode = (
  linkIds: LinkIdsType,
  targetNodeId: string,
): LinkIdsType => {
  return LinkDirections.reduce<LinkIdsType>(
    (acc, direction) => ({
      ...acc,
      [direction]:
        linkIds[direction] === targetNodeId ? null : linkIds[direction],
    }),
    { ...linkIds },
  );
};

export const NodeActionTypes = {
  addNode: 'addNode',
  addRootNode: 'addRootNode',
  edit: 'edit',
  delete: 'delete',
  set: 'set',
  addWords: 'addWords',
} as const;

export type NodeAction =
  | {
      type: 'addNode';
      payload: {
        node: MapNode;
        targetNodeId: string;
        direction: LinkDirectionType;
      };
    }
  | {
      type: 'addRootNode';
      payload: {
        node: MapNode;
      };
    }
  | {
      type: 'edit';
      payload: {
        id: string;
        changes: Partial<Pick<MapNode, 'title' | 'words'>>;
      };
    }
  | { type: 'delete'; payload: string }
  | { type: 'set'; payload: MapNode[] }
  | {
      type: 'addWords';
      payload: {
        targetNodeId: string;
        words: Record<WordGroupsType, Word[]>;
      };
    };

export function nodesReducer(state: MapNode[], action: NodeAction): MapNode[] {
  const { type, payload } = action;
  switch (type) {
    case NodeActionTypes.addNode: {
      const targetNode = state.find((node) => node.id === payload.targetNodeId);
      if (!targetNode) {
        console.error('add: target node not found: ', payload.targetNodeId);
        return state;
      }
      const newNodeUpdated = {
        ...payload.node,
        linkIds: {
          ...payload.node.linkIds,
          [oppositeDirections[payload.direction]]: targetNode.id,
        },
      };
      const targetNodeUpdated = {
        ...targetNode,
        linkIds: {
          ...targetNode.linkIds,
          [payload.direction]: newNodeUpdated.id,
        },
      };
      const nodesUpdated = state.map((node) =>
        node.id === targetNodeUpdated.id ? targetNodeUpdated : node,
      );
      return [...nodesUpdated, newNodeUpdated];
    }
    case NodeActionTypes.addRootNode: {
      const outerNodeId = payload.node.outerNodeId;
      const outerNode = state.find((node) => node.id === outerNodeId);
      if (!outerNode) {
        console.error('addRootNode: outer node not found: ', outerNodeId);
        return state;
      }
      if (outerNode.outerNodeId) {
        console.error('addRootNode: attempt for 2-lvl nesting: ', outerNodeId);
        return state;
      }
      if (state.some((node) => node.outerNodeId === outerNodeId)) {
        console.error(
          'addRootNode: attempt to create root node for non-empty map: ',
          outerNodeId,
        );
        return state;
      }
      return [...state, payload.node];
    }
    case NodeActionTypes.addWords: {
      const targetNode = state.find((node) => node.id === payload.targetNodeId);
      if (!targetNode) {
        console.error(
          'addWords: target node not found: ',
          payload.targetNodeId,
        );
        return state;
      }
      const wordsUpdated = Object.fromEntries(
        typedKeys(WordGroups).map((group) => [
          group,
          [...targetNode.words[group], ...payload.words[group]],
        ]),
      ) as Record<WordGroupsType, Word[]>;
      const targetNodeUpdated: MapNode = {
        ...targetNode,
        words: wordsUpdated,
      };
      const nodesUpdated = state.map((node) =>
        node.id === targetNodeUpdated.id ? targetNodeUpdated : node,
      );
      return nodesUpdated;
    }
    case NodeActionTypes.edit: {
      const nodesUpdated = state.map((node) =>
        node.id === payload.id ? { ...node, ...payload.changes } : node,
      );
      return nodesUpdated;
    }
    case NodeActionTypes.delete: {
      return state
        .filter((node) => node.id !== payload)
        .map((node) => ({
          ...node,
          linkIds: unlinkTargetNode(node.linkIds, payload),
        }));
    }
    case NodeActionTypes.set: {
      return payload;
    }
    default: {
      const _exhaustive: never = action;
      throw new Error('Unknown action: ' + JSON.stringify(_exhaustive));
    }
  }
}

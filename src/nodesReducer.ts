import type { LinkDirectionType, LinkIdsType, MapNode } from './data';
import { LinkDirections } from './data';

const oppositeDirections: Record<LinkDirectionType, LinkDirectionType> = {
  N: 'S',
  E: 'W',
  S: 'N',
  W: 'E',
};

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
  add: 'add',
  edit: 'edit',
  delete: 'delete',
  set: 'set',
} as const;

export type NodeAction =
  | {
      type: 'add';
      payload: {
        node: MapNode;
        targetNodeId: string;
        direction: LinkDirectionType;
      };
    }
  | {
      type: 'edit';
      payload: {
        id: string;
        changes: Partial<Pick<MapNode, 'title' | 'words' | 'level'>>;
      };
    }
  | { type: 'delete'; payload: string }
  | { type: 'set'; payload: MapNode[] };

export function nodesReducer(state: MapNode[], action: NodeAction): MapNode[] {
  const { type, payload } = action;
  switch (type) {
    case NodeActionTypes.add: {
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

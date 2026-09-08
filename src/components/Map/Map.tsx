import { LinkDirections } from '../../data';
import type { LinkDirectionType, NodeType } from '../../data';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FC, SyntheticEvent } from 'react';
import {
  MapContainer,
  MapZone,
  NODE_HEIGHT,
  NODE_SPACE,
  NODE_WIDTH,
  NodeAddButton,
  NodeLevel,
  NodeLink,
  NodeRoot,
  NodeTitle,
} from './styles';

const LEVELS_REQUIRED_PER_LINK = 3;

const oppositeDirections: Record<LinkDirectionType, LinkDirectionType> = {
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

const calculateAllPositions = (
  nodes: NodeType[],
  startNode: NodeType | null | undefined,
): Record<string, { x: number | null; y: number | null }> => {
  const positions: Record<string, { x: number | null; y: number | null }> =
    Object.fromEntries(nodes.map((n) => [n.id, { x: null, y: null }]));
  const walk = (
    currentNode: NodeType | null | undefined,
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

const mapToScale = (value: number, min: number, max: number): number => {
  if (min === max) return 1;
  const normalized = (value - min) / (max - min);
  return 0.8 + normalized * (1.1 - 0.8);
};

export const Map: FC<{
  nodes: NodeType[];
  nodeFocusedId: string | null;
  onNodeClick: (targetNode: NodeType) => void;
  onAddNodeClick: (targetNode: NodeType, direction: LinkDirectionType) => void;
  onMapClick: () => void;
}> = ({ nodes, nodeFocusedId, onNodeClick, onAddNodeClick, onMapClick }) => {
  const [nodeCenteredId, setNodeCenteredId] = useState<string | null>(null);
  const [nodeLevelPulsingId, setNodeLevelPulsingId] = useState<string | null>(
    null,
  );

  const handleDisabledClick = (nodeId: string) => {
    setNodeLevelPulsingId(null);
    requestAnimationFrame(() => {
      setNodeLevelPulsingId(nodeId);
    });
  };

  const mapZoneRef = useRef<HTMLDivElement | null>(null);

  const positions = useMemo(
    () => calculateAllPositions(nodes, nodes[0]),
    [nodes],
  );

  const minX = Math.min(
    ...Object.values(positions)
      .map((item) => item.x)
      .filter((item) => item !== null),
  );
  const minY = Math.min(
    ...Object.values(positions)
      .map((item) => item.y)
      .filter((item) => item !== null),
  );

  const positionsNormalized = useMemo(
    () =>
      Object.fromEntries(
        Object.keys(positions).map((id) => [
          id,
          {
            x: positions[id].x !== null ? positions[id].x - minX : null,
            y: positions[id].y !== null ? positions[id].y - minY : null,
          },
        ]),
      ),
    [positions, minX, minY],
  );

  const maxLevel = Math.max(...Object.values(nodes).map((node) => node.level));

  const nodeClickHandler = (e: SyntheticEvent, targetNode: NodeType) => {
    onNodeClick(targetNode);
    scrollToNode(targetNode.id);
    setNodeLevelPulsingId(null);
    setNodeCenteredId(targetNode.id);
    e.stopPropagation();
  };

  const addNodeClickHandler = (
    e: SyntheticEvent,
    targetNode: NodeType,
    direction: LinkDirectionType,
  ) => {
    const linksAmount = Object.values(targetNode.linkIds).filter(
      (id) => id !== null,
    ).length;
    e.stopPropagation();
    if (
      linksAmount >= Math.floor(targetNode.level / LEVELS_REQUIRED_PER_LINK)
    ) {
      handleDisabledClick(targetNode.id);
      return;
    }
    onAddNodeClick(targetNode, direction);
    scrollToNode(targetNode.id);
    setNodeLevelPulsingId(null);
    setNodeCenteredId(targetNode.id);
  };

  const mapWidth =
    Math.max(
      ...Object.values(positionsNormalized)
        .map((item) => item.x)
        .filter((item) => item !== null),
    ) *
      (NODE_WIDTH + NODE_SPACE) +
    NODE_WIDTH;

  const mapHeight =
    Math.max(
      ...Object.values(positionsNormalized)
        .map((item) => item.y)
        .filter((item) => item !== null),
    ) *
      (NODE_HEIGHT + NODE_SPACE) +
    NODE_HEIGHT;

  const scrollToNode = useCallback(
    (nodeId: string, behavior: ScrollBehavior = 'smooth') => {
      const scrollEl = mapZoneRef.current;
      if (!scrollEl) return;

      const position = positionsNormalized[nodeId];
      if (!position || position.x === null || position.y === null) return;

      const nodeLeft = position.x * (NODE_WIDTH + NODE_SPACE);
      const nodeTop = position.y * (NODE_HEIGHT + NODE_SPACE);

      const nodeCenterX = nodeLeft + NODE_WIDTH / 2;
      const nodeCenterY = nodeTop + NODE_HEIGHT / 2;

      const targetScrollLeft = nodeCenterX - scrollEl.clientWidth / 2;
      const targetScrollTop = nodeCenterY - scrollEl.clientHeight / 2;

      const maxScrollLeft = scrollEl.scrollWidth - scrollEl.clientWidth;
      const maxScrollTop = scrollEl.scrollHeight - scrollEl.clientHeight;

      scrollEl.scrollTo({
        left: Math.max(0, Math.min(targetScrollLeft, maxScrollLeft)),
        top: Math.max(0, Math.min(targetScrollTop, maxScrollTop)),
        behavior,
      });
    },
    [positionsNormalized],
  );

  useEffect(() => {
    const scrollEl = mapZoneRef.current;
    if (!scrollEl || !nodeCenteredId) return;

    const resizeObserver = new ResizeObserver(() => {
      scrollToNode(nodeCenteredId, 'smooth');
    });

    resizeObserver.observe(scrollEl);

    return () => {
      resizeObserver.disconnect();
    };
  }, [nodeCenteredId, scrollToNode]);

  return (
    <MapZone ref={mapZoneRef} onClick={() => onMapClick()}>
      <MapContainer width={mapWidth} height={mapHeight}>
        {nodes.map((node) => {
          const { x, y } = positionsNormalized[node.id];
          if (x === null || y === null) return;
          const left = x * (NODE_WIDTH + NODE_SPACE);
          const top = y * (NODE_HEIGHT + NODE_SPACE);

          const isFocused = nodeFocusedId === node.id;
          const isLinkedToFocused =
            !!nodeFocusedId &&
            Object.values(node.linkIds)
              .filter((item) => item !== null)
              .includes(nodeFocusedId);

          const canExpandN = !Object.values(positionsNormalized).some(
            (position) => position.x === x && position.y === y - 1,
          );
          const canExpandE = !Object.values(positionsNormalized).some(
            (position) => position.x === x + 1 && position.y === y,
          );
          const canExpandS = !Object.values(positionsNormalized).some(
            (position) => position.x === x && position.y === y + 1,
          );
          const canExpandW = !Object.values(positionsNormalized).some(
            (position) => position.x === x - 1 && position.y === y,
          );
          return (
            <>
              {node.linkIds.S && (
                <NodeLink
                  type="V"
                  top={top + NODE_HEIGHT / 2}
                  left={left + NODE_WIDTH / 2}
                  focused={
                    isFocused ||
                    (isLinkedToFocused && node.linkIds.S === nodeFocusedId)
                  }
                  muted={
                    nodeFocusedId !== null &&
                    !isFocused &&
                    !(isLinkedToFocused && node.linkIds.S === nodeFocusedId)
                  }
                ></NodeLink>
              )}
              {node.linkIds.E && (
                <NodeLink
                  type="H"
                  top={top + NODE_HEIGHT / 2}
                  left={left + NODE_WIDTH / 2}
                  focused={
                    isFocused ||
                    (isLinkedToFocused && node.linkIds.E === nodeFocusedId)
                  }
                  muted={
                    nodeFocusedId !== null &&
                    !isFocused &&
                    !(isLinkedToFocused && node.linkIds.E === nodeFocusedId)
                  }
                ></NodeLink>
              )}
              <NodeRoot
                key={node.id}
                top={top}
                left={left}
                focused={isFocused || isLinkedToFocused}
                showLinkButtons={isFocused}
                muted={
                  nodeFocusedId !== null && !isFocused && !isLinkedToFocused
                }
                scale={mapToScale(node.level, 0, maxLevel)}
                onClick={(e) => nodeClickHandler(e, node)}
              >
                <NodeTitle>
                  {node.title === '' ? 'Name me' : node.title}
                </NodeTitle>
                <NodeLevel
                  animated={nodeLevelPulsingId === node.id}
                  closestBreakpoint={`${(Math.floor(node.level / 3) * 3 + 3).toString()}`}
                  onAnimationEnd={() => {
                    if (nodeLevelPulsingId === node.id) {
                      setNodeLevelPulsingId(null);
                    }
                  }}
                >
                  <span>{node.level}</span>
                </NodeLevel>
                {canExpandN && (
                  <NodeAddButton
                    onClick={(e) => addNodeClickHandler(e, node, 'N')}
                    direction="N"
                  >
                    +
                  </NodeAddButton>
                )}
                {canExpandE && (
                  <NodeAddButton
                    onClick={(e) => addNodeClickHandler(e, node, 'E')}
                    direction="E"
                  >
                    +
                  </NodeAddButton>
                )}
                {canExpandS && (
                  <NodeAddButton
                    onClick={(e) => addNodeClickHandler(e, node, 'S')}
                    direction="S"
                  >
                    +
                  </NodeAddButton>
                )}
                {canExpandW && (
                  <NodeAddButton
                    onClick={(e) => addNodeClickHandler(e, node, 'W')}
                    direction="W"
                  >
                    +
                  </NodeAddButton>
                )}
              </NodeRoot>
            </>
          );
        })}
      </MapContainer>
    </MapZone>
  );
};

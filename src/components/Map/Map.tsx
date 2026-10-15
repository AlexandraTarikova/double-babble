import type { LinkDirectionType, MapNode } from '../../data';
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import { calculateAllPositions, getNodeLevel } from '../../helpers';

const LEVELS_REQUIRED_PER_LINK = 3;

const mapToScale = (value: number, min: number, max: number): number => {
  if (min === max) return 1;
  const normalized = (value - min) / (max - min);
  return 0.8 + normalized * (1.1 - 0.8);
};

export const Map: FC<{
  nodes: MapNode[];
  nodeZoomedId: string | null;
  nodeFocusedId: string | null;
  onNodeClick: (targetNode: MapNode) => void;
  onAddNodeClick: (targetNode: MapNode, direction: LinkDirectionType) => void;
  onMapClick: () => void;
}> = ({
  nodes,
  nodeZoomedId,
  nodeFocusedId,
  onNodeClick,
  onAddNodeClick,
  onMapClick,
}) => {
  const rootNodeId = nodes[0]?.id;
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

  const maxLevel = Math.max(
    ...Object.values(nodes).map((node) => getNodeLevel(node)),
  );

  const nodeClickHandler = (e: SyntheticEvent, targetNode: MapNode) => {
    onNodeClick(targetNode);
    scrollToNode(targetNode.id);
    setNodeLevelPulsingId(null);
    setNodeCenteredId(targetNode.id);
    e.stopPropagation();
  };

  const addNodeClickHandler = (
    e: SyntheticEvent,
    targetNode: MapNode,
    direction: LinkDirectionType,
  ) => {
    const linksAmount = Object.values(targetNode.linkIds).filter(
      (id) => id !== null,
    ).length;
    e.stopPropagation();

    const childrenAmount = linksAmount - (targetNode.id === rootNodeId ? 0 : 1);

    if (
      childrenAmount >=
      Math.floor(getNodeLevel(targetNode) / LEVELS_REQUIRED_PER_LINK)
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
    <MapZone
      ref={mapZoneRef}
      onClick={() => onMapClick()}
      isZoomed={!!nodeZoomedId}
    >
      <MapContainer width={mapWidth} height={mapHeight}>
        {nodes.map((node) => {
          const { x, y } = positionsNormalized[node.id];
          if (x === null || y === null) return;
          const left = x * (NODE_WIDTH + NODE_SPACE);
          const top = y * (NODE_HEIGHT + NODE_SPACE);

          const hasTitle = node.title !== '';
          const isFocused = nodeFocusedId === node.id;
          const isLinkedToFocused =
            !!nodeFocusedId &&
            Object.values(node.linkIds)
              .filter((item) => item !== null)
              .includes(nodeFocusedId);

          const canExpandN =
            hasTitle &&
            !Object.values(positionsNormalized).some(
              (position) => position.x === x && position.y === y - 1,
            );
          const canExpandE =
            hasTitle &&
            !Object.values(positionsNormalized).some(
              (position) => position.x === x + 1 && position.y === y,
            );
          const canExpandS =
            hasTitle &&
            !Object.values(positionsNormalized).some(
              (position) => position.x === x && position.y === y + 1,
            );
          const canExpandW =
            hasTitle &&
            !Object.values(positionsNormalized).some(
              (position) => position.x === x - 1 && position.y === y,
            );
          const level = getNodeLevel(node);
          const linksAmount = Object.values(node.linkIds).filter(
            (id) => id !== null,
          ).length;
          const childrenAmount = linksAmount - (node.id === rootNodeId ? 0 : 1);
          return (
            <Fragment key={node.id}>
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
                scale={mapToScale(level, 0, maxLevel)}
                onClick={(e) => nodeClickHandler(e, node)}
              >
                <NodeTitle>
                  {node.title === '' ? 'Name me' : node.title}
                </NodeTitle>
                <NodeLevel
                  animated={nodeLevelPulsingId === node.id}
                  closestBreakpoint={`${((childrenAmount + 1) * LEVELS_REQUIRED_PER_LINK).toString()}`}
                  onAnimationEnd={() => {
                    if (nodeLevelPulsingId === node.id) {
                      setNodeLevelPulsingId(null);
                    }
                  }}
                >
                  <span>{level}</span>
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
            </Fragment>
          );
        })}
      </MapContainer>
    </MapZone>
  );
};

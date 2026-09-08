import { Box, styled } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './Theme';
import { LinkDirections, NODES_DEMO } from './data';
import { useState } from 'react';
import { SideMenu } from './components/SideMenu/SideMenu';
import { Map } from './components/Map';
import { DebugPanel } from './components/DebugPanel';

import type { LinkDirectionType, LinkIdsType, NodeType } from './data';

const COLOUR_DARK = '#361C2E';

const RootZone = styled(Box)({
  minWidth: '100vw',
  minHeight: '100vh',
  position: 'relative',
  background: COLOUR_DARK,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'stretch',
  overflow: 'hidden',
});

const oppositeDirections: Record<LinkDirectionType, LinkDirectionType> = {
  N: 'S',
  E: 'W',
  S: 'N',
  W: 'E',
};

const makeId = () =>
  Date.now().toString(36) +
  Math.floor(Math.pow(10, 12) + Math.random() * 9 * Math.pow(10, 12)).toString(
    36,
  );

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

const newNode = {
  id: 'newNode',
  title: '',
  level: 0,
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

type SideMenuType = string | null;

function App() {
  const [nodes, setNodes] = useState(NODES_DEMO);
  const [menuType, setMenuType] = useState<SideMenuType>(null);
  const nodeInFocus = menuType
    ? nodes.find((item) => item.id === menuType)
    : null;

  const onNodeClick = (targetNode: NodeType) => {
    setMenuType(targetNode.id);
  };
  const onNodeRename = (targetNode: NodeType, newName: string) => {
    const nodesUnaffected = nodes.filter((node) => node.id !== targetNode.id);
    const targetNodeUpdated = { ...targetNode, title: newName };
    setNodes([...nodesUnaffected, targetNodeUpdated]);
  };

  const onAddNodeClick = (
    targetNode: NodeType,
    direction: LinkDirectionType,
  ) => {
    const id = makeId();
    const nodesUnaffected = nodes.filter((node) => node.id !== targetNode.id);
    const newNodeUpdated = {
      ...newNode,
      id,
      linkIds: {
        ...newNode.linkIds,
        [oppositeDirections[direction]]: targetNode.id,
      },
    };
    const targetNodeUpdated = {
      ...targetNode,
      linkIds: { ...targetNode.linkIds, [direction]: newNodeUpdated.id },
    };
    setNodes([...nodesUnaffected, targetNodeUpdated, newNodeUpdated]);
    setMenuType(id);
  };

  const onCancelNewNodeClick = (targetNodeId: string) => {
    setNodes((nodes) =>
      nodes
        .filter((node) => node.id !== targetNodeId)
        .map((node) => ({
          ...node,
          linkIds: unlinkTargetNode(node.linkIds, targetNodeId),
        })),
    );
    closeMenu();
  };

  const closeMenu = () => {
    setMenuType(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <DebugPanel />
      <RootZone>
        <Map
          nodes={nodes}
          nodeFocusedId={nodeInFocus ? nodeInFocus.id : null}
          onNodeClick={onNodeClick}
          onAddNodeClick={onAddNodeClick}
          onMapClick={closeMenu}
        />
        {!!nodeInFocus && (
          <SideMenu
            nodeInFocus={nodeInFocus}
            onNodeRename={(newName) => onNodeRename(nodeInFocus, newName)}
            onCancelClick={onCancelNewNodeClick}
          />
        )}
      </RootZone>
    </ThemeProvider>
  );
}

export default App;

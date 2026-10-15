import { Box, styled } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './Theme';
import { useCallback, useMemo, useState } from 'react';
import { SideMenu } from './components/SideMenu/SideMenu';
import { Map } from './components/Map';
import { DebugPanel } from './components/DebugPanel';

import type { LinkDirectionType, MapNode, WordGroupsType, Word } from './data';
import { createNode } from './helpers';
import { getInitialState, saveAction } from './storageHistory';
import { useReducer } from 'react';
import { NodeActionTypes, nodesReducer, type NodeAction } from './nodesReducer';
import {
  COLOUR_DARK,
  COLOUR_LIGHT,
  TextButton,
} from './components/SideMenu/styles';

const RootZone = styled(Box)({
  minWidth: '100vw',
  minHeight: '100dvh',
  position: 'relative',
  background: COLOUR_DARK,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'stretch',
  overflow: 'hidden',
});

export const MapHeader = styled(Box)({
  width: '100%',
  fontFamily: '"Press Start 2P", system-ui',
  padding: '8px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
});

export const MapTitle = styled(Box)({
  width: '100%',
  textAlign: 'center',
  fontSize: '32px',
  color: COLOUR_LIGHT,
  marginBottom: '16px',
});

export const LeftColumn = styled(Box)({
  maxHeight: '100dvh',
  width: '100%',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
});

type SideMenuType = string | null;

function App() {
  const [nodes, dispatchNodes] = useReducer(
    nodesReducer,
    undefined,
    getInitialState,
  );
  const [menuType, setMenuType] = useState<SideMenuType>(null);
  const [nodeZoomedId, setNodeZoomedId] = useState<string | null>(null);
  const nodeInFocus = menuType
    ? nodes.find((item) => item.id === menuType)
    : null;

  const nodeZoomed = nodeZoomedId
    ? nodes.find((item) => item.id === nodeZoomedId)
    : null;

  const nodesToDisplay = useMemo(() => {
    if (nodeZoomed) {
      return nodes.filter((node) => node.outerNodeId === nodeZoomed.id);
    }
    return nodes.filter((node) => !node.outerNodeId);
  }, [nodes, nodeZoomed]);

  const dispatch = useCallback((action: NodeAction) => {
    saveAction(action);
    dispatchNodes(action);
  }, []);

  const onNodeClick = (targetNode: MapNode) => {
    setMenuType(targetNode.id);
  };
  const onNodeRename = (targetNode: MapNode, newName: string) => {
    dispatch({
      type: NodeActionTypes.edit,
      payload: { id: targetNode.id, changes: { title: newName } },
    });
  };

  const onAddNodeClick = (
    targetNode: MapNode,
    direction: LinkDirectionType,
  ) => {
    const newNode = createNode(nodeZoomed?.id);
    dispatch({
      type: NodeActionTypes.addNode,
      payload: {
        node: newNode,
        targetNodeId: targetNode.id,
        direction,
      },
    });
    setMenuType(newNode.id);
  };

  const onCancelNewNodeClick = (targetNodeId: string) => {
    if (nodesToDisplay.length > 1) {
      dispatch({ type: NodeActionTypes.delete, payload: targetNodeId });
    }
    closeMenu();
  };

  const onAddWords = (
    targetNodeId: string,
    words: Record<WordGroupsType, Word[]>,
  ) => {
    dispatch({
      type: NodeActionTypes.addWords,
      payload: { targetNodeId, words },
    });
  };

  const closeMenu = () => {
    setMenuType(null);
  };

  const onZoomClick = (id: string | null) => {
    if (id && !nodes.some((node) => node.outerNodeId === id)) {
      const newNode = createNode(id);
      dispatch({
        type: NodeActionTypes.addRootNode,
        payload: {
          node: newNode,
        },
      });
    }
    closeMenu();
    setNodeZoomedId(id);
  };

  return (
    <ThemeProvider theme={theme}>
      <DebugPanel
        nodes={nodes}
        dispatchNodes={dispatchNodes}
        closeMenu={closeMenu}
        setNodeZoomedId={setNodeZoomedId}
      />
      <RootZone>
        <LeftColumn>
          {nodeZoomed && (
            <MapHeader>
              <MapTitle>{nodeZoomed.title}</MapTitle>
              <TextButton onClick={() => onZoomClick(null)}>
                {'<- ZOOM ->'}
              </TextButton>
            </MapHeader>
          )}
          <Map
            nodes={nodesToDisplay}
            nodeFocusedId={nodeInFocus ? nodeInFocus.id : null}
            nodeZoomedId={nodeZoomedId}
            onNodeClick={onNodeClick}
            onAddNodeClick={onAddNodeClick}
            onMapClick={closeMenu}
            key={nodeZoomedId ?? 'root'}
          />
        </LeftColumn>
        {!!nodeInFocus && (
          <SideMenu
            key={nodeInFocus.id}
            nodeInFocus={nodeInFocus}
            onNodeRename={(newName) => onNodeRename(nodeInFocus, newName)}
            onCancelClick={onCancelNewNodeClick}
            onCloseClick={closeMenu}
            onZoomClick={onZoomClick}
            onAddWords={onAddWords}
          />
        )}
      </RootZone>
    </ThemeProvider>
  );
}

export default App;

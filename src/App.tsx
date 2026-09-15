import { Box, styled } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './Theme';
import { useCallback, useState } from 'react';
import { SideMenu } from './components/SideMenu/SideMenu';
import { Map } from './components/Map';
import { DebugPanel } from './components/DebugPanel';

import type { LinkDirectionType, MapNode } from './data';
import { createNode } from './helpers';
import { getInitialState, saveAction } from './storage';
import { useReducer } from 'react';
import { NodeActionTypes, nodesReducer, type NodeAction } from './nodesReducer';

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

type SideMenuType = string | null;

function App() {
  const [nodes, dispatchNodes] = useReducer(
    nodesReducer,
    undefined,
    getInitialState,
  );
  const [menuType, setMenuType] = useState<SideMenuType>(null);
  const nodeInFocus = menuType
    ? nodes.find((item) => item.id === menuType)
    : null;

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
    const newNode = createNode();
    dispatch({
      type: NodeActionTypes.add,
      payload: {
        node: newNode,
        targetNodeId: targetNode.id,
        direction,
      },
    });
    setMenuType(newNode.id);
  };

  const onCancelNewNodeClick = (targetNodeId: string) => {
    if (nodes.length > 1) {
      dispatch({ type: NodeActionTypes.delete, payload: targetNodeId });
    }
    closeMenu();
  };

  const closeMenu = () => {
    setMenuType(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <DebugPanel dispatchNodes={dispatchNodes} closeMenu={closeMenu} />
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
            key={nodeInFocus.id}
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

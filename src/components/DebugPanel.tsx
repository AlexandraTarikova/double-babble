import { Box, styled } from '@mui/material';
import type { FC, ActionDispatch } from 'react';
import { COLOUR_LIGHT } from './SideMenu/styles';
import { NODES_DEMO } from '../data';
import type { NodeAction } from '../nodesReducer';
import { resetHistoryTo } from '../storage';
import { createEmptyMap } from '../helpers';

export const DebugButton = styled('button')({
  padding: '4px 12px',
  margin: '4px 12px',
  border: `1px solid ${COLOUR_LIGHT}`,
});

export const DebugPanel: FC<{
  dispatchNodes: ActionDispatch<[action: NodeAction]>;
  closeMenu: () => void;
}> = ({ dispatchNodes, closeMenu }) => {
  return (
    <Box position={'fixed'} top={0} left={0} zIndex={100}>
      <DebugButton
        onClick={() => {
          dispatchNodes({
            type: 'set',
            payload: resetHistoryTo(createEmptyMap()),
          });
          closeMenu();
        }}
      >
        Clear history
      </DebugButton>
      <DebugButton
        onClick={() => {
          dispatchNodes({
            type: 'set',
            payload: resetHistoryTo(structuredClone(NODES_DEMO)),
          });
          closeMenu();
        }}
      >
        Use demo
      </DebugButton>
    </Box>
  );
};

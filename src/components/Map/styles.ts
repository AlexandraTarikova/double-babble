import { styled, Box, keyframes } from '@mui/material';
import type { LinkDirectionType } from '../../data';
import {
  COLOUR_DARK,
  COLOUR_FOCUS,
  COLOUR_HIGHLIGHT,
  COLOUR_LIGHT,
  COLOUR_MUTED,
} from '../SideMenu/styles';

export const NODE_WIDTH = 150;
export const NODE_HEIGHT = 80;
export const NODE_SPACE = 60;

export const MapZone = styled(Box)({
  width: '100%',
  position: 'relative',
  background: COLOUR_DARK,
  padding: '60px',
  maxHeight: '100dvh',
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath fill-rule='evenodd' d='M11 0l5 20H6l5-20zm42 31a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM0 72h40v4H0v-4zm0-8h31v4H0v-4zm20-16h20v4H20v-4zM0 56h40v4H0v-4zm63-25a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM53 41a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-30 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-28-8a5 5 0 0 0-10 0h10zm10 0a5 5 0 0 1-10 0h10zM56 5a5 5 0 0 0-10 0h10zm10 0a5 5 0 0 1-10 0h10zm-3 46a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm10 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM21 0l5 20H16l5-20zm43 64v-4h-4v4h-4v4h4v4h4v-4h4v-4h-4zM36 13h4v4h-4v-4zm4 4h4v4h-4v-4zm-4 4h4v4h-4v-4zm8-8h4v4h-4v-4z'/%3E%3C/g%3E%3C/svg%3E\")",

  overflow: 'auto',

  scrollbarWidth: 'thin',
  scrollbarColor: 'transparent transparent',

  '&:hover': {
    scrollbarColor: `${COLOUR_LIGHT} transparent`,
  },

  '&::-webkit-scrollbar': {
    width: '10px',
    height: '10px',
  },

  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },

  '&::-webkit-scrollbar-thumb': {
    background: 'transparent',
  },

  '&:hover::-webkit-scrollbar-track': {
    background: 'transparent',
  },

  '&:hover::-webkit-scrollbar-thumb': {
    background: COLOUR_LIGHT,
    border: `2px solid ${COLOUR_DARK}`,
  },

  '&::-webkit-scrollbar-corner': {
    background: 'transparent',
  },
});

export const MapContainer = styled(Box, {
  shouldForwardProp: (propName) =>
    propName !== 'width' && propName !== 'height',
})<{ width: number; height: number }>(({ width, height }) => ({
  width: `${width}px`,
  height: `${height}px`,
  position: 'relative',
}));

export const NodeRoot = styled(Box, {
  shouldForwardProp: (propName) =>
    propName !== 'top' &&
    propName !== 'left' &&
    propName !== 'focused' &&
    propName !== 'showLinkButtons' &&
    propName !== 'scale' &&
    propName !== 'muted',
})<{
  top: number;
  left: number;
  focused: boolean;
  showLinkButtons: boolean;
  muted: boolean;
  scale: number;
}>(({ theme, top, left, focused, showLinkButtons, muted, scale }) => ({
  position: 'absolute',
  width: `${NODE_WIDTH}px`,
  height: `${NODE_HEIGHT}px`,
  top: `${top}px`,
  left: `${left}px`,
  border: `2px solid ${focused ? COLOUR_FOCUS : muted ? COLOUR_MUTED : COLOUR_LIGHT}`,
  color: focused ? COLOUR_FOCUS : muted ? COLOUR_MUTED : COLOUR_LIGHT,
  background: COLOUR_DARK,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1,
  cursor: 'pointer',
  fontSize: '12px',
  fontFamily: '"Press Start 2P", system-ui',
  transform: `scale(${scale})`,
  padding: '4px',
  '&:hover': {
    transform: `scale(${scale + 0.1})`,
  },
  '&> button': {
    visibility: showLinkButtons ? 'visible' : 'hidden',
    cursor: showLinkButtons ? 'pointer' : 'initial',
    [theme.breakpoints.down('md')]: {
      visibility: 'visible',
    },
  },
}));

const addButtonTop = {
  N: '0',
  E: '50%',
  S: '100%',
  W: '50%',
};

const addButtonLeft = {
  N: '50%',
  E: '100%',
  S: '50%',
  W: '0',
};

export const NodeAddButton = styled('button', {
  shouldForwardProp: (propName) => propName !== 'position',
})<{ direction: LinkDirectionType }>(({ theme, direction }) => ({
  position: 'absolute',
  top: addButtonTop[direction],
  left: addButtonLeft[direction],
  transform: 'translate(-50%, -50%)',
  width: '30px',
  height: '30px',
  // borderRadius: "50%",
  // border: `solid 1px ${COLOUR_LIGHT}`,
  border: 'none',
  fontSize: '16px',

  background: COLOUR_DARK,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  visibility: 'hidden',
  '&:hover': {
    // transform: "translate(-50%, -50%) scale(1.2, 1.2)",
    fontSize: '24px',
  },
  '&::after': {
    content: "''",
    width: '40px',
    height: '40px',
    position: 'absolute',
    left: '-5px',
    right: '-5px',
  },
  [theme.breakpoints.down('md')]: {
    visibility: 'visible',
  },
}));

export const NodeLink = styled(Box, {
  shouldForwardProp: (propName) =>
    propName !== 'top' &&
    propName !== 'left' &&
    propName !== 'type' &&
    propName !== 'focused' &&
    propName !== 'muted',
})<{
  top: number;
  left: number;
  type: 'H' | 'V';
  focused: boolean;
  muted: boolean;
}>(({ top, left, type, focused, muted }) => ({
  position: 'absolute',
  top: `${top}px`,
  left: `${left}px`,
  zIndex: 0,
  opacity: muted ? 0.8 : 1,
  ...(type === 'H'
    ? {
        borderTop: `5px dashed ${focused ? COLOUR_FOCUS : muted ? COLOUR_MUTED : COLOUR_LIGHT}`,
        width: `${NODE_WIDTH + NODE_SPACE}px`,
        height: 0,
      }
    : {
        borderLeft: `5px dashed ${focused ? COLOUR_FOCUS : muted ? COLOUR_MUTED : COLOUR_LIGHT}`,
        width: 0,
        height: `${NODE_HEIGHT + NODE_SPACE}px`,
      }),
}));

export const NodeTitle = styled(Box)({
  textAlign: 'center',
});

const hintPulse = keyframes`
  0%, 100% {
    transform: translate(-50%,0) scale(1);
    visibility: visible;
    opacity: 1;
  }
  50% {
    transform: translate(-50%,0) scale(1.2);
    visibility: visible;
    opacity: 0.85;
  }
`;

export const NodeLevel = styled(Box, {
  shouldForwardProp: (propName) =>
    propName !== 'animated' && propName !== 'closestBreakpoint',
})<{ animated: boolean; closestBreakpoint: string }>(
  ({ animated, closestBreakpoint }) => ({
    fontSize: '12px',
    position: 'absolute',
    top: '-10px',
    right: '8px',
    background: COLOUR_DARK,
    padding: '0 2px',
    '&::after': {
      content: `'${closestBreakpoint}'`,
      position: 'absolute',
      left: '50%',
      top: '-36px',
      color: COLOUR_HIGHLIGHT,
      visibility: 'hidden',
      animation: animated ? `${hintPulse} 0.6s ease-in-out 2` : 'none',
      transform: 'translate(-50%,0)',
    },
    '&::before': {
      content: "'↑'",
      position: 'absolute',
      left: '50%',
      top: '-16px',
      fontSize: '8px',
      color: COLOUR_HIGHLIGHT,
      visibility: 'hidden',
      animation: animated ? `${hintPulse} 0.6s ease-in-out 2` : 'none',
    },
  }),
);

import { Box, keyframes, styled, TextField } from '@mui/material';
import type { Language } from '../../data';

export const COLOUR_LIGHT = '#D5B9B2';
export const COLOUR_DARK = '#361C2E';
export const COLOUR_DARK_MUTED = '#42283a';
export const COLOUR_HIGHLIGHT = '#F3DE2C';
export const COLOUR_MUTED = '#765B63';
export const COLOUR_FOCUS = '#FFF';

export const COLOUR_LANGUAGE_LEFT = '#FF7070';
export const COLOUR_LANGUAGE_CENTER = '#FFF';
export const COLOUR_LANGUAGE_RIGHT = '#629FD0';

export const languageColors: Partial<Record<Language, string>> = {
  french: COLOUR_LANGUAGE_LEFT,
  swedish: COLOUR_LANGUAGE_RIGHT,
};

export const TextButton = styled('button', {
  shouldForwardProp: (propName) => propName !== 'active',
})<{ active?: boolean }>(({ active = false }) => ({
  color: active ? COLOUR_LIGHT : COLOUR_MUTED,
  '&:not(:disabled):hover': {
    color: COLOUR_FOCUS,
  },
  '&:disabled': {
    color: COLOUR_DARK_MUTED,
    cursor: 'default',
  },
}));

export const LanguageHeaderRoot = styled(Box)({
  width: '100%',
  fontSize: '24px',
  marginTop: '32px',
  marginBottom: '-32px',
  display: 'flex',
  '& > span': {
    display: 'inline-block',
    // textAlign: "center",
  },
  '& > span:nth-child(1)': {
    width: '30%',
    color: COLOUR_LANGUAGE_LEFT,
  },
  '& > span:nth-child(2)': {
    width: '40%',
    padding: '0 24px',
    color: COLOUR_LANGUAGE_CENTER,
  },
  '& > span:nth-child(3)': {
    width: '30%',
    color: COLOUR_LANGUAGE_RIGHT,
  },
});

export const WordGroup = styled(Box)({
  marginTop: '40px',
});

export const WordGroupHeader = styled(Box)({
  width: '100%',
  fontSize: '14px',
  textAlign: 'center',
  color: COLOUR_HIGHLIGHT,
  position: 'relative',
  // marginTop: "24px",
  '&::before': {
    content: "''",
    width: '100%',
    height: '1px',
    // borderTop: `1px dashed ${COLOUR_HIGHLIGHT}`,
    background: COLOUR_HIGHLIGHT,
    position: 'absolute',
    left: 0,
    top: '50%',
  },
  '& > span': {
    background: COLOUR_DARK,
    position: 'relative',
  },
});

export const WordLine = styled(Box)({
  display: 'flex',
  paddingTop: '12px',
  '& > div:nth-child(1), & > div:nth-child(3)': {
    width: '30%',
  },
  '& > div:nth-child(2)': {
    width: '40%',
    padding: '0 24px',
  },
});
export const WordTranslation = styled(Box)({
  fontSize: '20px',
});
export const WordExample = styled(Box)({
  fontSize: '14px',
  color: COLOUR_LIGHT,
});

export const NoWordsHint = styled(Box)({
  width: '100%',
  textAlign: 'center',
  fontSize: '16px',
  color: COLOUR_HIGHLIGHT,
});

export const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
`;

export const MenuZone = styled(Box)({
  minWidth: '60%',
  position: 'relative',
  background: COLOUR_DARK,
  // padding: '40px',
  padding: '8px 40px 40px 40px',
  borderLeft: `1px solid ${COLOUR_DARK_MUTED}`,
  maxHeight: '100vh',
  overflowY: 'auto',
  overflowX: 'visible',

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
  '&:not(:hover)::-webkit-scrollbar-thumb': {
    background: 'transparent',
    border: '2px solid transparent',
  },

  '&:hover::-webkit-scrollbar-thumb': {
    background: COLOUR_LIGHT,
    border: `2px solid ${COLOUR_DARK}`,
  },

  '&::-webkit-scrollbar-corner': {
    background: 'transparent',
  },
});
export const ModePanel = styled(Box, {
  shouldForwardProp: (propName) => propName !== 'hidden',
})<{ hidden?: boolean }>(({ hidden = false }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  color: COLOUR_MUTED,
  gap: '24px',
  fontSize: '16px',
  marginBottom: '12px',
  visibility: hidden ? 'hidden' : 'visible',
}));
export const ModeButton = styled(TextButton)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  color: COLOUR_MUTED,
  gap: '24px',
  fontSize: '16px',
  marginBottom: '12px',
});

export const MenuHeader = styled(Box)({
  width: '100%',
  fontSize: '32px',
  textAlign: 'center',
  marginBottom: '20px',
  fontFamily: '"Press Start 2P", system-ui',
});
export const MenuNodeLevel = styled(Box)({
  color: COLOUR_LIGHT,
  fontSize: '12px',
});

export const LevelUpButton = styled(Box, {
  shouldForwardProp: (propName) => propName !== 'animated',
})<{ animated: boolean }>(({ animated }) => ({
  animation: animated ? `${pulse} .6s infinite` : 'none',
  display: 'inline-block',
}));

export const NewTitleWrapper = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
});

export const TextFieldStyled = styled(TextField)({
  '& .MuiInputBase-input': {
    fontFamily: '"Press Start 2P", system-ui',
    '&::placeholder': {
      fontFamily: '"Press Start 2P", system-ui',
    },
  },
  marginRight: '20px',
});

export const TitleButton = styled('button')({
  display: 'inline-block',
  border: `2px solid ${COLOUR_LIGHT}`,
  margin: '0 4px',
  padding: '4px 8px',
  textAlign: 'center',
  fontSize: '16px',
  color: COLOUR_LIGHT,
  '&:hover': {
    color: '#FFF',
    borderColor: '#FFF',
  },
  '&:disabled': {
    color: COLOUR_DARK_MUTED,
    borderColor: COLOUR_DARK_MUTED,
  },
});

export const TextFieldWord = styled(TextField)({
  '& .MuiInputBase-input': {
    color: 'inherit',
    fontSize: '16px',
    fontFamily: 'inherit',
    '&.Mui-disabled': {
      WebkitTextFillColor: 'inherit',
    },
  },
  '& .MuiInputBase-root': {
    color: 'inherit',
    fontSize: '16px',
    fontFamily: 'inherit',

    '&:before': {
      borderBottomColor: COLOUR_DARK_MUTED,
    },

    '&:hover:not(.Mui-disabled):before': {
      borderBottomColor: COLOUR_DARK_MUTED,
    },

    '&:after': {
      borderBottomColor: COLOUR_DARK_MUTED,
    },
    '&.Mui-disabled': {
      color: 'inherit',
    },
  },
  marginRight: '40px',
});

export const ButtonsLine = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  gap: '16px',
  marginTop: '40px',
});

export const SubmitWordsButton = styled('button')({
  display: 'inline-block',
  border: `2px solid ${COLOUR_LIGHT}`,
  margin: '0 4px',
  padding: '4px 8px',
  textAlign: 'center',
  fontSize: '16px',
  color: COLOUR_LIGHT,
  fontFamily: '"Press Start 2P", system-ui',
  '&:hover': {
    color: '#FFF',
    borderColor: '#FFF',
  },
  '&:disabled': {
    color: COLOUR_MUTED,
    borderColor: COLOUR_MUTED,
    pointerEvents: 'none',
  },
});

export const AutotranslateButton = styled('button')({
  display: 'inline-block',
  textAlign: 'center',
  fontSize: '16px',
  color: COLOUR_LIGHT,
  fontFamily: '"Press Start 2P", system-ui',
  '&:hover': {
    color: '#FFF',
    borderColor: '#FFF',
  },
  '&:disabled': {
    color: COLOUR_MUTED,
    borderColor: COLOUR_MUTED,
  },
});

export const ActionsPanel = styled(Box)({
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '12px',
  marginTop: '16px',
  color: COLOUR_LIGHT,
  fontFamily: '"Press Start 2P", system-ui',
});

export const TrainingIndicatorLine = styled(Box)({
  position: 'relative',
  top: '-6px',
  height: '21px',
});

export const TrainingIndicator = styled('span', {
  shouldForwardProp: (propName) => propName !== 'value',
})<{ value: null | number }>(({ value }) => ({
  color: value === 1 ? COLOUR_FOCUS : COLOUR_MUTED,
  position: 'relative',
  marginRight: '2px',
  display: 'inline-block',
  verticalAlign: 'middle',
  fontWeight: value === null ? 'bold' : 'normal',
  fontSize: '16px',
}));

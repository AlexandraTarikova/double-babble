import { Box, styled, useMediaQuery } from '@mui/material';
import { type FC, type ActionDispatch, useState } from 'react';
import { COLOUR_DARK, COLOUR_LIGHT, TextButton } from './SideMenu/styles';
import {
  languageC,
  languageL,
  languageR,
  WordGroups,
  type MapNode,
  type Word,
  type WordGroupsType,
} from '../data';
import type { NodeAction } from '../nodesReducer';
import { resetHistoryTo } from '../storageHistory';
import {
  createEmptyMap,
  getWordKey,
  typedEntries,
  typedKeys,
} from '../helpers';
import { setWordStrengthList } from '../storageStrength';
import { NODES_DEMO } from '../nodesDemo';

export const DebugButton = styled(TextButton)({
  padding: '4px 12px',
  margin: '4px 8px',
  border: `1px solid ${COLOUR_LIGHT}`,
  fontWeight: 'bold',
  background: COLOUR_DARK,
});

export const DebugPanel: FC<{
  nodes: MapNode[];
  dispatchNodes: ActionDispatch<[action: NodeAction]>;
  setNodeZoomedId: (id: string | null) => void;
  closeMenu: () => void;
}> = ({ nodes, dispatchNodes, setNodeZoomedId, closeMenu }) => {
  const [expanded, setExpanded] = useState(false);
  const isSmallScreen = useMediaQuery((t) => t.breakpoints.down('md'));

  const onGenerateTrainingDataClick = () => {
    const allWords = Object.fromEntries(
      typedKeys(WordGroups).map((group) => [
        group,
        nodes.flatMap((node) => node.words[group]),
      ]),
    ) as Record<WordGroupsType, Word[]>;
    const newList = generateTestData(allWords);
    setWordStrengthList(newList);
  };

  if (isSmallScreen) return null;

  return (
    <Box position={'fixed'} top={0} left={0} zIndex={100} display={'flex'}>
      <Box fontSize={24}>
        <TextButton onClick={() => setExpanded(!expanded)}>
          [{expanded ? '-' : '+'}]
        </TextButton>
      </Box>
      {expanded && (
        <Box>
          <DebugButton
            onClick={() => {
              dispatchNodes({
                type: 'set',
                payload: resetHistoryTo(createEmptyMap()),
              });
              closeMenu();
              setNodeZoomedId(null);
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
              setNodeZoomedId(null);
            }}
          >
            Use demo
          </DebugButton>
          <DebugButton onClick={onGenerateTrainingDataClick}>
            Generate training data
          </DebugButton>
          <DebugButton onClick={() => setWordStrengthList()}>
            Reset training data
          </DebugButton>
        </Box>
      )}
    </Box>
  );
};

function generateTestData(words: Record<WordGroupsType, Word[]>) {
  const allKeys = typedEntries(words).flatMap(([group, words]) =>
    words.flatMap((word) => [
      getWordKey({
        wordFrom: word.translations[languageC],
        wordTo: word.translations[languageL],
        from: languageC,
        to: languageL,
        group,
      }),
      getWordKey({
        wordFrom: word.translations[languageC],
        wordTo: word.translations[languageR],
        from: languageC,
        to: languageR,
        group,
      }),
    ]),
  );
  return Object.fromEntries(
    allKeys.map((key) => [
      key,
      { results: randomRecentResults(), lastCheck: randomRecentDate() },
    ]),
  );
}

function randomRecentDate(days = 14) {
  return new Date(Date.now() - Math.random() * days * 24 * 60 * 60 * 1000);
}

function randomRecentResults(n = 20) {
  return Array.from({ length: Math.floor(Math.random() * (n + 1)) }, () => {
    const [n1, n2, n3] = [
      Math.floor(Math.random() * 3) - 1,
      Math.floor(Math.random() * 3) - 1,
      Math.floor(Math.random() * 3) - 1,
    ];
    return [n1, n2, n3].includes(1) ? 1 : n1;
  });
}

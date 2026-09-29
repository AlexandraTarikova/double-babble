import type { MapNode } from '../../data';
import {
  ActionsPanel,
  LevelUpButton,
  MenuNodeLevel,
  TextButton,
} from './styles';
import { Box } from '@mui/material';
import type { FC } from 'react';
import { getNodeLevel } from '../../helpers';

export const TitleBlock: FC<{
  nodeInFocus: MapNode;
  levelUpInProgress: boolean;
  mode: string;
  setLevelUpInProgress: (value: boolean) => void;
  onZoomClick: () => void;
  onResetClick: () => void;
}> = ({
  nodeInFocus,
  levelUpInProgress,
  mode,
  setLevelUpInProgress,
  onZoomClick,
  onResetClick,
}) => {
  const totalAmount = Object.values(nodeInFocus.words).flat().length;

  const level = getNodeLevel(nodeInFocus);

  return (
    <>
      <Box
        display={'flex'}
        justifyContent={'center'}
        alignItems={'center'}
        position={'relative'}
      >
        {nodeInFocus?.title}
      </Box>
      <MenuNodeLevel>
        Level {level}{' '}
        {levelUpInProgress ? (
          `-> ${level + 1}`
        ) : (
          <LevelUpButton
            animated={totalAmount === 0}
            disabled={mode === 'train'}
            onClick={() => setLevelUpInProgress(true)}
          >
            <TextButton>[+]</TextButton>
          </LevelUpButton>
        )}
      </MenuNodeLevel>
      {totalAmount !== 0 && (
        <ActionsPanel>
          {mode === 'words' && (
            <TextButton disabled={levelUpInProgress} onClick={onZoomClick}>
              {'+> '}ZOOM{' <+'}
            </TextButton>
          )}
          {mode === 'train' && (
            <TextButton disabled={levelUpInProgress} onClick={onResetClick}>
              ~ RESET ~
            </TextButton>
          )}
        </ActionsPanel>
      )}
    </>
  );
};

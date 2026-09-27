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
  setLevelUpInProgress: (value: boolean) => void;
}> = ({ nodeInFocus, levelUpInProgress, setLevelUpInProgress }) => {
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
            onClick={() => setLevelUpInProgress(true)}
          >
            <TextButton>[+]</TextButton>
          </LevelUpButton>
        )}
      </MenuNodeLevel>
      {totalAmount !== 0 && (
        <ActionsPanel>
          <TextButton disabled={levelUpInProgress}>
            {'+> '}ZOOM{' <+'}
          </TextButton>
        </ActionsPanel>
      )}
    </>
  );
};

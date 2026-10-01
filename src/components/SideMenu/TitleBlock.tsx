import type { MapNode, SideMenuMode } from '../../data';
import { LevelUpButton, MenuNodeLevel, TextButton } from './styles';
import { Box } from '@mui/material';
import type { FC } from 'react';
import { getNodeLevel } from '../../helpers';

export const TitleBlock: FC<{
  nodeInFocus: MapNode;
  mode: string;
  setMode: (value: SideMenuMode) => void;
}> = ({ nodeInFocus, mode, setMode }) => {
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
        {mode === 'levelUp' ? (
          `-> ${level + 1}`
        ) : (
          <LevelUpButton
            animated={totalAmount === 0}
            onClick={() => setMode('levelUp')}
          >
            <TextButton>[+]</TextButton>
          </LevelUpButton>
        )}
      </MenuNodeLevel>
    </>
  );
};

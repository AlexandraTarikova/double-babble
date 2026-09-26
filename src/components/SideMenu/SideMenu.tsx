import { useState } from 'react';
import type { MapNode, WordGroupsType, Word } from '../../data';
import { WordList } from './WordList';
import {
  ActionsPanel,
  LevelUpButton,
  MenuHeader,
  MenuNodeLevel,
  MenuZone,
  ModePanel,
  NewTitleWrapper,
  TextButton,
  TextFieldStyled,
  TitleButton,
} from './styles';
import { WordAdd } from './WordAdd';
import { Box } from '@mui/material';
import styled from '@emotion/styled';
import type { FC } from 'react';
import { getNodeLevel } from '../../helpers';

export const TitleSVGButton = styled(Box)({
  width: '50px',
  height: '50px',
  padding: '4px',
  // border: "2px solid #d6b9b2",
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  marginLeft: '16px',
  color: '#d6b9b2',
  '& > svg': {
    width: '100%',
    height: '100%',
  },
});

export const SideMenu: FC<{
  nodeInFocus: MapNode;
  onNodeRename: (newName: string) => void;
  onCancelClick: (targetNodeId: string) => void;
  onAddWords: (
    targetNodeId: string,
    words: Record<WordGroupsType, Word[]>,
  ) => void;
}> = ({ nodeInFocus, onNodeRename, onCancelClick, onAddWords }) => {
  const totalAmount = Object.values(nodeInFocus.words).flat().length;
  const [title, setTitle] = useState(nodeInFocus.title);

  const [levelUpInProgress, setLevelUpInProgress] = useState(false);

  const hasTitle = nodeInFocus?.title !== '';

  const onSubmitTitle = (newName: string) => {
    onNodeRename(newName);
  };

  const level = getNodeLevel(nodeInFocus);

  return (
    <MenuZone>
      <MenuHeader>
        {hasTitle && (
          <>
            <ModePanel>
              <TextButton focused={true}>[WORDS]</TextButton>
              {level > 0 && <TextButton>[TRAIN]</TextButton>}
              <TextButton>[EDIT]</TextButton>
            </ModePanel>
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
        )}
        {!hasTitle && (
          <NewTitleWrapper>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onSubmitTitle(title);
              }}
            >
              <TextFieldStyled
                id="new-stamp-title"
                placeholder="Title"
                // helperText="Basic plant name"
                value={title}
                variant="standard"
                size="medium"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  setTitle(event.target.value);
                }}
                focused={true}
              />
            </form>
            <TitleButton
              disabled={title === ''}
              onClick={() => onSubmitTitle(title)}
            >
              ok
            </TitleButton>
            <TitleButton onClick={() => onCancelClick(nodeInFocus.id)}>
              x
            </TitleButton>
          </NewTitleWrapper>
        )}
      </MenuHeader>
      {hasTitle && !levelUpInProgress && <WordList nodeInFocus={nodeInFocus} />}
      {hasTitle && levelUpInProgress && (
        <WordAdd
          nodeInFocus={nodeInFocus}
          goBack={() => setLevelUpInProgress(false)}
          onAddWords={onAddWords}
        />
      )}
      {/* {hasTitle && levelUpInProgress && (

      )} */}
    </MenuZone>
  );
};

import { useState } from 'react';
import type { MapNode, WordGroupsType, Word } from '../../data';
import { WordList } from './WordList';
import { MenuHeader, MenuZone, ModePanel, TextButton } from './styles';
import { WordAdd } from './WordAdd';
import type { FC } from 'react';
import { getNodeLevel } from '../../helpers';
import { NewTitle } from './NewTitle';
import { TitleBlock } from './TitleBlock';
import { TrainMode } from './TrainMode';

export const SideMenu: FC<{
  nodeInFocus: MapNode;
  onNodeRename: (newName: string) => void;
  onCancelClick: (targetNodeId: string) => void;
  onAddWords: (
    targetNodeId: string,
    words: Record<WordGroupsType, Word[]>,
  ) => void;
}> = ({ nodeInFocus, onNodeRename, onCancelClick, onAddWords }) => {
  const hasTitle = nodeInFocus?.title !== '';
  const [mode, setMode] = useState(() => (hasTitle ? 'words' : 'initial'));
  const [trainingKey, setTrainingKey] = useState(0);

  const [levelUpInProgress, setLevelUpInProgress] = useState(false);

  const onSubmitTitle = (newName: string) => {
    onNodeRename(newName);
    if (mode === 'initial') {
      setMode('words');
    }
  };

  const level = getNodeLevel(nodeInFocus);

  const onZoomClick = () => {
    //WIP
  };

  const onResetTrainingClick = () => {
    setTrainingKey((prev) => prev + 1);
  };

  return (
    <MenuZone>
      <MenuHeader>
        <ModePanel hidden={mode === 'initial'}>
          <TextButton
            active={mode === 'words'}
            onClick={() => setMode('words')}
          >
            [WORDS]
          </TextButton>
          {level > 0 && (
            <TextButton
              active={mode === 'train'}
              onClick={() => setMode('train')}
            >
              [TRAIN]
            </TextButton>
          )}
          <TextButton>[EDIT]</TextButton>
        </ModePanel>
        {hasTitle && (
          <TitleBlock
            levelUpInProgress={levelUpInProgress}
            setLevelUpInProgress={setLevelUpInProgress}
            nodeInFocus={nodeInFocus}
            mode={mode}
            onZoomClick={onZoomClick}
            onResetClick={onResetTrainingClick}
          />
        )}
        {!hasTitle && (
          <NewTitle
            onCancelClick={() => onCancelClick(nodeInFocus.id)}
            onSubmitTitle={onSubmitTitle}
          />
        )}
      </MenuHeader>
      {mode === 'words' && !levelUpInProgress && (
        <WordList nodeInFocus={nodeInFocus} />
      )}
      {mode === 'words' && levelUpInProgress && (
        <WordAdd
          nodeInFocus={nodeInFocus}
          goBack={() => setLevelUpInProgress(false)}
          onAddWords={onAddWords}
        />
      )}
      {mode === 'train' && (
        <TrainMode nodeInFocus={nodeInFocus} key={trainingKey} />
      )}
    </MenuZone>
  );
};

import { useState } from 'react';
import {
  type MapNode,
  type WordGroupsType,
  type Word,
  SideMenuMode,
} from '../../data';
import { WordList } from './WordList';
import { MenuHeader, MenuZone, ModePanel, TextButton } from './styles';
import { WordAdd } from './WordAdd';
import type { FC } from 'react';
import { getNodeLevel } from '../../helpers';
import { NewTitle } from './NewTitle';
import { TitleBlock } from './TitleBlock';
import { TrainMode } from './TrainView';
import { ProgressView } from './ProgressView';

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
  const [mode, setMode] = useState<SideMenuMode>(() =>
    hasTitle ? 'words' : 'initial',
  );
  const [trainingKey, setTrainingKey] = useState(0);

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

  const onModeButtonClick = (newMode: SideMenuMode) => {
    if (mode === 'levelUp') {
      return;
    }
    setMode(newMode);
  };

  return (
    <MenuZone>
      <MenuHeader>
        <ModePanel hidden={mode === 'initial'}>
          <TextButton
            active={mode === 'words' || mode === 'levelUp'}
            onClick={() => onModeButtonClick('words')}
          >
            [WORDS]
          </TextButton>
          {level > 0 && (
            <TextButton
              disabled={mode === 'levelUp'}
              active={mode === 'train'}
              onClick={() => onModeButtonClick('train')}
            >
              [TRAIN]
            </TextButton>
          )}
          <TextButton
            disabled={mode === 'levelUp'}
            active={mode === 'progress'}
            onClick={() => onModeButtonClick('progress')}
          >
            [PROGRESS]
          </TextButton>
          <TextButton disabled={mode === 'levelUp'}>[EDIT]</TextButton>
        </ModePanel>
        {hasTitle && (
          <TitleBlock setMode={setMode} nodeInFocus={nodeInFocus} mode={mode} />
        )}
        {!hasTitle && (
          <NewTitle
            onCancelClick={() => onCancelClick(nodeInFocus.id)}
            onSubmitTitle={onSubmitTitle}
          />
        )}
      </MenuHeader>
      {mode === 'words' && (
        <WordList nodeInFocus={nodeInFocus} onZoomClick={onZoomClick} />
      )}
      {mode === 'levelUp' && (
        <WordAdd
          nodeInFocus={nodeInFocus}
          goBack={() => setMode('words')}
          onAddWords={onAddWords}
        />
      )}
      {mode === 'train' && (
        <TrainMode
          nodeInFocus={nodeInFocus}
          key={trainingKey}
          onResetClick={onResetTrainingClick}
        />
      )}
      {mode === 'progress' && (
        <ProgressView nodeInFocus={nodeInFocus} onZoomClick={onZoomClick} />
      )}
    </MenuZone>
  );
};

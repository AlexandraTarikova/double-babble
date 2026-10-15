import { useState } from 'react';
import {
  type MapNode,
  type WordGroupsType,
  type Word,
  SideMenuMode,
  languageL,
  languageC,
  languageR,
} from '../../data';
import { WordList } from './WordList';
import {
  BackToMapButton,
  MenuHeader,
  MenuZone,
  ModePanel,
  TextButton,
} from './styles';
import { WordAdd } from './WordAdd';
import type { FC } from 'react';
import { getNodeLevel } from '../../helpers';
import { NewTitle } from './NewTitle';
import { TitleBlock } from './TitleBlock';
import { TrainMode } from './TrainView';
import { ProgressView } from './ProgressView';
import { useMediaQuery } from '@mui/material';

export const SideMenu: FC<{
  nodeInFocus: MapNode;
  onNodeRename: (newName: string) => void;
  onCancelClick: (targetNodeId: string) => void;
  onCloseClick: () => void;
  onZoomClick: (id: string | null) => void;
  onAddWords: (
    targetNodeId: string,
    words: Record<WordGroupsType, Word[]>,
  ) => void;
}> = ({
  nodeInFocus,
  onCloseClick,
  onZoomClick,
  onNodeRename,
  onCancelClick,
  onAddWords,
}) => {
  const isSmallScreen = useMediaQuery((t) => t.breakpoints.down('md'));
  const isExtraSmallScreen = useMediaQuery((t) => t.breakpoints.down('sm'));
  const hasTitle = nodeInFocus?.title !== '';
  const [mode, setMode] = useState<SideMenuMode>(() =>
    hasTitle ? 'words' : 'initial',
  );
  const [trainingKey, setTrainingKey] = useState(0);

  const [sideLanguage, setSideLanguage] = useState(languageL);
  const languagesVisible = isSmallScreen
    ? [sideLanguage, languageC]
    : [languageL, languageC, languageR];

  const onSubmitTitle = (newName: string) => {
    onNodeRename(newName);
    if (mode === 'initial') {
      setMode('words');
    }
  };

  const level = getNodeLevel(nodeInFocus);

  const onResetTrainingClick = () => {
    setTrainingKey((prev) => prev + 1);
  };

  const onModeButtonClick = (newMode: SideMenuMode) => {
    if (mode === 'levelUp') {
      return;
    }
    setMode(newMode);
  };

  const onLanguageClick = isSmallScreen
    ? () =>
        setSideLanguage((prev) => (prev === languageL ? languageR : languageL))
    : undefined;

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
          {!isExtraSmallScreen && (
            <TextButton disabled={true}>[EDIT]</TextButton>
          )}
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
        <WordList
          nodeInFocus={nodeInFocus}
          languagesVisible={languagesVisible}
          onLanguageClick={onLanguageClick}
          onZoomClick={onZoomClick}
        />
      )}
      {mode === 'levelUp' && (
        <WordAdd
          nodeInFocus={nodeInFocus}
          languagesVisible={languagesVisible}
          onLanguageClick={onLanguageClick}
          goBack={() => setMode('words')}
          onAddWords={onAddWords}
        />
      )}
      {mode === 'train' && (
        <TrainMode
          nodeInFocus={nodeInFocus}
          languagesVisible={languagesVisible}
          onLanguageClick={onLanguageClick}
          key={trainingKey}
          onResetClick={onResetTrainingClick}
        />
      )}
      {mode === 'progress' && (
        <ProgressView
          nodeInFocus={nodeInFocus}
          languagesVisible={languagesVisible}
          onLanguageClick={onLanguageClick}
        />
      )}
      {hasTitle && (
        <BackToMapButton onClick={onCloseClick}>{'<'}</BackToMapButton>
      )}
    </MenuZone>
  );
};

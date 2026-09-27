import { useState } from 'react';
import type { MapNode, WordGroupsType, Word } from '../../data';
import { WordList } from './WordList';
import { MenuHeader, MenuZone, ModePanel, TextButton } from './styles';
import { WordAdd } from './WordAdd';
import type { FC } from 'react';
import { getNodeLevel } from '../../helpers';
import { NewTitle } from './NewTitle';
import { TitleBlock } from './TitleBlock';

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

  const [levelUpInProgress, setLevelUpInProgress] = useState(false);

  const onSubmitTitle = (newName: string) => {
    onNodeRename(newName);
    if (mode === 'initial') {
      setMode('words');
    }
  };

  const level = getNodeLevel(nodeInFocus);

  return (
    <MenuZone>
      <MenuHeader>
        <ModePanel hidden={mode === 'initial'}>
          <TextButton focused={true}>[WORDS]</TextButton>
          {level > 0 && <TextButton>[TRAIN]</TextButton>}
          <TextButton>[EDIT]</TextButton>
        </ModePanel>
        {hasTitle && (
          <TitleBlock
            levelUpInProgress={levelUpInProgress}
            setLevelUpInProgress={setLevelUpInProgress}
            nodeInFocus={nodeInFocus}
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
    </MenuZone>
  );
};

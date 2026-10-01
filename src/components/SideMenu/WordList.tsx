import { Box } from '@mui/material';
import type { FC } from 'react';
import { languageC, languageL, languageR, WordGroups } from '../../data';
import type { MapNode } from '../../data';
import {
  ActionsPanel,
  languageColors,
  NoWordsHint,
  TextButton,
  WordExample,
  WordGroup,
  WordGroupHeader,
  WordLine,
  WordTranslation,
} from './styles';
import { typedEntries } from '../../helpers';
import { LanguageHeader } from './LanguageHeader';

export const WordList: FC<{
  nodeInFocus: MapNode;
  onZoomClick: () => void;
}> = ({ nodeInFocus, onZoomClick }) => {
  const totalAmount = Object.values(nodeInFocus.words).flat().length;

  return (
    <>
      {totalAmount !== 0 && (
        <ActionsPanel>
          <TextButton
            disabled={
              nodeInFocus.innerNodeIds.length === 0 && !nodeInFocus.parentId
            }
            onClick={onZoomClick}
          >
            {nodeInFocus.parentId ? '<- ZOOM ->' : '+> ZOOM <+'}
          </TextButton>
        </ActionsPanel>
      )}
      {totalAmount !== 0 && <LanguageHeader />}
      {totalAmount === 0 ? (
        <NoWordsHint>
          Click the [+] button to level up and add words
        </NoWordsHint>
      ) : (
        typedEntries(WordGroups).map(
          ([key, label]) =>
            nodeInFocus.words[key].length !== 0 && (
              <WordGroup>
                <WordGroupHeader key={key}>
                  <span>
                    {label} [{nodeInFocus?.words[key].length}]
                  </span>
                </WordGroupHeader>
                {nodeInFocus.words[key].map((word) => (
                  <WordLine
                    key={`${word.translations[languageC]}_${word.translations[languageL]}_${word.translations[languageR]}`}
                  >
                    {[languageL, languageC, languageR].map((language) => (
                      <Box>
                        <WordTranslation color={languageColors[language]}>
                          {word.translations[language]}
                        </WordTranslation>
                        {word.examples?.[language] && (
                          <WordExample>{word.examples[language]}</WordExample>
                        )}
                      </Box>
                    ))}
                  </WordLine>
                ))}
              </WordGroup>
            ),
        )
      )}
    </>
  );
};

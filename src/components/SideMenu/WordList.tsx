import { Box } from '@mui/material';
import type { FC } from 'react';
import { Languages, WordGroups } from '../../data';
import type { Language, MapNode } from '../../data';
import {
  COLOUR_LANGUAGE_LEFT,
  COLOUR_LANGUAGE_RIGHT,
  LanguagesHeader,
  NoWordsHint,
  WordExample,
  WordGroup,
  WordGroupHeader,
  WordLine,
  WordTranslation,
} from './styles';
import { typedEntries } from '../../helpers';

export const WordList: FC<{
  nodeInFocus: MapNode;
}> = ({ nodeInFocus }) => {
  const totalAmount = Object.values(nodeInFocus.words).flat().length;
  const [languageL, languageC, languageR]: Language[] = [
    'french',
    'english',
    'swedish',
  ];

  return (
    <>
      {totalAmount !== 0 && (
        <LanguagesHeader>
          <span>{Languages[languageL]}</span>
          <span>{Languages[languageC]}</span>
          <span>{Languages[languageR]}</span>
        </LanguagesHeader>
      )}
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
                    <Box>
                      <WordTranslation color={COLOUR_LANGUAGE_LEFT}>
                        {word.translations[languageL]}
                      </WordTranslation>
                      {word.examples?.[languageL] && (
                        <WordExample>{word.examples[languageL]}</WordExample>
                      )}
                    </Box>
                    <Box>
                      <WordTranslation>
                        {word.translations[languageC]}
                      </WordTranslation>
                      {word.examples?.[languageC] && (
                        <WordExample>{word.examples[languageC]}</WordExample>
                      )}
                    </Box>
                    <Box>
                      <WordTranslation color={COLOUR_LANGUAGE_RIGHT}>
                        {word.translations[languageR]}
                      </WordTranslation>
                      {word.examples?.[languageR] && (
                        <WordExample>{word.examples[languageR]}</WordExample>
                      )}
                    </Box>
                  </WordLine>
                ))}
              </WordGroup>
            ),
        )
      )}
    </>
  );
};

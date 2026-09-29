import { Box, styled } from '@mui/material';
import { useState, type FC } from 'react';
import { WordGroups } from '../../data';
import type { Language, MapNode, Word, WordGroupsType } from '../../data';
import {
  COLOUR_FOCUS,
  languageColors,
  TextButton,
  WordExample,
  WordGroup,
  WordGroupHeader,
  WordLine,
  WordTranslation,
} from './styles';
import { typedEntries } from '../../helpers';
import { LanguageHeader } from './LanguageHeader';
import {
  getWordStrengthList,
  saveWordStrengthList,
} from '../../storageStrength';

export const RevealButton = styled('button')({
  color: 'inherit',
  '&:hover': {
    color: COLOUR_FOCUS,
  },
});

const placeholderWord = '███████';
const placeholderExample = '███ ███████ █████';

type EntryId = {
  group: WordGroupsType;
  index: number;
  language: Language;
};

const isSameEntry = (a: EntryId, b: EntryId) =>
  a.index === b.index && a.language === b.language && a.group === b.group;

export const TrainMode: FC<{
  nodeInFocus: MapNode;
}> = ({ nodeInFocus }) => {
  const [languageL, languageC, languageR]: Language[] = [
    'french',
    'english',
    'swedish',
  ];

  const [words, setWords] = useState(
    Object.fromEntries(
      typedEntries(nodeInFocus.words).map(([key, value]) => [
        key,
        value.map((item) => ({ ...item, revealed: [languageC] })),
      ]),
    ) as Record<WordGroupsType, (Word & { revealed: Language[] })[]>,
  );

  const wordStrengthList = getWordStrengthList() ?? {};

  const [evaluationPending, setEvaluationPending] = useState<null | EntryId>(
    null,
  );

  const onRevealClick = ({ group, index, language }: EntryId) => {
    const wordsUpdated = {
      ...words,
      [group]: words[group].map((item, i) =>
        i === index
          ? { ...item, revealed: [...item.revealed, language] }
          : item,
      ),
    };
    setWords(() => wordsUpdated);
    setEvaluationPending({ group, index, language });
  };

  const onSelfEvaluationClick = (
    group: WordGroupsType,
    word: string,
    language: Language,
    offset: number,
  ) => {
    const key = `${group}_${language}_${word}`;
    const updatedList = {
      ...wordStrengthList,
      [key]: (wordStrengthList[key] ?? 0) + offset,
    };
    saveWordStrengthList(updatedList);
    setEvaluationPending(null);
  };

  return (
    <>
      <LanguageHeader />
      {typedEntries(WordGroups).map(
        ([group, label]) =>
          words[group].length !== 0 && (
            <WordGroup>
              <WordGroupHeader key={group}>
                <span>
                  {label} [{words[group].length}]
                </span>
              </WordGroupHeader>
              {words[group].map((word, index) => (
                <WordLine
                  key={`${word.translations[languageC]}_${word.translations[languageL]}_${word.translations[languageR]}`}
                >
                  {[languageL, languageC, languageR].map((language) => (
                    <Box>
                      <WordTranslation color={languageColors[language]}>
                        {word.revealed.includes(language) ? (
                          word.translations[language]
                        ) : (
                          <RevealButton
                            onClick={() =>
                              onRevealClick({ group, index, language })
                            }
                          >
                            {placeholderWord}
                          </RevealButton>
                        )}{' '}
                        {evaluationPending &&
                          isSameEntry(evaluationPending, {
                            group,
                            index,
                            language: language,
                          }) && (
                            <>
                              <TextButton
                                active
                                onClick={() =>
                                  onSelfEvaluationClick(
                                    group,
                                    word.translations[language],
                                    language,
                                    1,
                                  )
                                }
                              >
                                [✔]
                              </TextButton>
                              <TextButton
                                active
                                onClick={() =>
                                  onSelfEvaluationClick(
                                    group,
                                    word.translations[language],
                                    language,
                                    -1,
                                  )
                                }
                              >
                                [~]
                              </TextButton>
                              <TextButton
                                active
                                onClick={() =>
                                  onSelfEvaluationClick(
                                    group,
                                    word.translations[language],
                                    language,
                                    -2,
                                  )
                                }
                              >
                                [x]
                              </TextButton>
                            </>
                          )}
                      </WordTranslation>
                      {word.examples?.[language] && (
                        <WordExample>
                          {word.revealed.includes(language)
                            ? word.examples[language]
                            : placeholderExample}
                        </WordExample>
                      )}
                    </Box>
                  ))}
                </WordLine>
              ))}
            </WordGroup>
          ),
      )}
    </>
  );
};

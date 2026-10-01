import { Box, styled } from '@mui/material';
import { useState, type FC } from 'react';
import { languageC, languageL, languageR, WordGroups } from '../../data';
import type {
  Language,
  MapNode,
  Word,
  WordGroupsType,
  WordStrengthList,
} from '../../data';
import {
  ActionsPanel,
  COLOUR_FOCUS,
  languageColors,
  TextButton,
  WordExample,
  WordGroup,
  WordGroupHeader,
  WordLine,
  WordTranslation,
} from './styles';
import { getWordKey, typedEntries } from '../../helpers';
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
  onResetClick: () => void;
}> = ({ nodeInFocus, onResetClick }) => {
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
    value: number,
  ) => {
    const key = getWordKey({ group, word, to: language, from: languageC });
    const current = wordStrengthList[key];

    const updatedList: WordStrengthList = {
      ...wordStrengthList,
      [key]: {
        results: [...(current?.results ?? []), value],
        lastCheck: new Date(),
      },
    };
    saveWordStrengthList(updatedList);
    setEvaluationPending(null);
  };

  return (
    <>
      <ActionsPanel>
        <TextButton onClick={onResetClick}>~ RESET ~</TextButton>
      </ActionsPanel>
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
                              {[
                                { label: '[✔]', value: 1 },
                                { label: '[~]', value: 0 },
                                { label: '[x]', value: -1 },
                              ].map(({ label, value }) => (
                                <TextButton
                                  active
                                  onClick={() =>
                                    onSelfEvaluationClick(
                                      group,
                                      word.translations[language],
                                      language,
                                      value,
                                    )
                                  }
                                >
                                  {label}
                                </TextButton>
                              ))}
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

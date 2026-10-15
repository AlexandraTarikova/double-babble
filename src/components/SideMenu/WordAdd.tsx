import { useState } from 'react';
import type { FC } from 'react';
import { languageC, languageL, languageR, WordGroups } from '../../data';
import type { MapNode, WordGroupsType, Word, Language } from '../../data';
import {
  ActionsPanel,
  ButtonsLine,
  languageColors,
  SubmitWordsButton,
  TextButton,
  TextFieldWord,
  WordCell,
  WordGroup,
  WordGroupHeader,
  WordLine,
  WordTranslation,
} from './styles';
import {
  typedKeys,
  typedEntries,
  REQUIRED_WORDS_PER_LEVEL,
  getNodeLevel,
} from '../../helpers';
import { LanguageHeader } from './LanguageHeader';

const emptyTranslations: Record<Language, string> = {
  french: '',
  english: '',
  swedish: '',
};

const makeInitWordGroup = (length: number): Word[] =>
  Array.from({ length }).map(() => ({
    translations: { ...emptyTranslations },
    examples: {},
  }));

const isWordComplete = (word: Word) =>
  !Object.values(word.translations).includes('');

const languageCode: Record<Language, string> = {
  french: 'fr',
  swedish: 'sv',
  english: 'en',
};

const translate = async (word: string, from: Language, to: Language) => {
  const response = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=${languageCode[from]}|${languageCode[to]}`,
  );
  if (!response.ok) {
    throw new Error(
      `Error while translating '${word}' from '${from}' to '${to}'`,
    );
  }
  const data = await response.json();
  return data?.responseData?.translatedText ?? '';
};

const getPromiseValue = <T,>(r: PromiseSettledResult<T>) => {
  if (r.status === 'rejected') {
    console.error(r.reason);
    return undefined;
  }
  return r.value;
};

export const WordAdd: FC<{
  nodeInFocus: MapNode;
  languagesVisible: Language[];
  onLanguageClick?: () => void;
  goBack: () => void;
  onAddWords: (
    targetNodeId: string,
    words: Record<WordGroupsType, Word[]>,
  ) => void;
}> = ({
  nodeInFocus,
  languagesVisible,
  onLanguageClick,
  goBack,
  onAddWords,
}) => {
  const deficit = Object.fromEntries(
    typedKeys(WordGroups).map((group) => [
      group,
      Math.max(
        0,
        (getNodeLevel(nodeInFocus) + 1) * REQUIRED_WORDS_PER_LEVEL[group] -
          nodeInFocus.words[group].length,
      ),
    ]),
  ) as Record<WordGroupsType, number>;
  const [words, setWords] = useState<Record<WordGroupsType, Word[]>>(
    () =>
      Object.fromEntries(
        typedKeys(WordGroups).map((group) => [
          group,
          makeInitWordGroup(deficit[group]),
        ]),
      ) as Record<WordGroupsType, Word[]>,
  );
  const [inputTouched, setInputTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmPending, setIsConfirmPending] = useState(false);

  const handleChangeWord =
    (group: WordGroupsType, i: number, language: Language) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const wordsUpdated = words[group].map((word, index) =>
        index !== i
          ? word
          : {
              ...word,
              translations: {
                ...word.translations,
                [language]: event.target.value,
              },
            },
      );
      setWords({ ...words, [group]: wordsUpdated });
      setInputTouched(true);
      setIsConfirmPending(false);
    };

  const handleSubmit = () => {
    const valid = Object.fromEntries(
      typedEntries(words).map(([group, items]) => [
        group,
        items.filter((word) => isWordComplete(word)),
      ]),
    ) as Record<WordGroupsType, Word[]>;
    if (Object.values(valid).some((item) => item.length > 0)) {
      onAddWords(nodeInFocus.id, valid);
      goBack();
    }
  };

  const autoTranslate = async () => {
    setIsLoading(true);

    try {
      const targets = Object.values(words).flatMap((arr) =>
        arr.map((word) => word.translations[languageC]),
      );

      const [translationsL, translationsR] = await Promise.all(
        [languageL, languageR].map(async (languageTo) => {
          const results = await Promise.allSettled(
            targets.map((word) =>
              word !== '' ? translate(word, languageC, languageTo) : undefined,
            ),
          );
          return results.map(getPromiseValue);
        }),
      );

      let i = -1;
      const wordsUpdated = Object.fromEntries(
        typedKeys(words).map((group) => [
          group,
          words[group].map((word) => {
            ++i;
            return {
              ...word,
              translations: {
                ...word.translations,
                [languageL]: translationsL[i] ?? word.translations[languageL],
                [languageR]: translationsR[i] ?? word.translations[languageR],
              },
            };
          }),
        ]),
      ) as Record<WordGroupsType, Word[]>;
      setWords(() => wordsUpdated);
      setInputTouched(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const enableAutoTranslation =
    typedKeys(WordGroups).some(
      (group) =>
        words[group].filter((word) => !!word.translations[languageC]).length !==
        0,
    ) && inputTouched;

  const allFilled = typedKeys(WordGroups).every(
    (group) =>
      words[group].filter((word) => !isWordComplete(word)).length === 0,
  );
  const anyFilled = typedKeys(WordGroups).some(
    (group) =>
      words[group].length > 0 &&
      words[group].some((word) => isWordComplete(word)),
  );

  const onXClick = () => {
    if (isConfirmPending || !anyFilled) {
      goBack();
    } else {
      setIsConfirmPending(true);
    }
  };

  return (
    <>
      <ActionsPanel>
        <TextButton disabled={true} hideOnDesktop={!!nodeInFocus.outerNodeId}>
          {nodeInFocus.outerNodeId ? '<- ZOOM ->' : '+> ZOOM <+'}
        </TextButton>
      </ActionsPanel>
      <LanguageHeader
        onButtonClick={autoTranslate}
        disabled={!enableAutoTranslation}
        loading={isLoading}
        onLanguageClick={onLanguageClick}
        languageVisible={languagesVisible}
      />
      {typedEntries(WordGroups).map(([group, label]) => {
        const wordsInGroup = words[group];
        return (
          <WordGroup key={`${group}_group`}>
            <WordGroupHeader>
              <span>
                {label} [{deficit[group]}]
              </span>
            </WordGroupHeader>
            {wordsInGroup.map((_, index) => (
              <WordLine key={`${group}_${index}`}>
                {[languageL, languageC, languageR].map((language) => (
                  <WordCell
                    hidden={!languagesVisible.includes(language)}
                    key={`${language}_word`}
                  >
                    <WordTranslation color={languageColors[language]}>
                      <TextFieldWord
                        disabled={isLoading}
                        id={`${group}_${index}_${language}_input`}
                        value={
                          language === languageC
                            ? wordsInGroup[index].translations[languageC]
                            : isLoading &&
                                !!wordsInGroup[index].translations[languageC]
                              ? '...'
                              : wordsInGroup[index].translations[language]
                        }
                        variant="standard"
                        size="medium"
                        onChange={handleChangeWord(group, index, language)}
                        fullWidth
                      />
                    </WordTranslation>
                  </WordCell>
                ))}
              </WordLine>
            ))}
          </WordGroup>
        );
      })}
      <ButtonsLine>
        <SubmitWordsButton disabled={!anyFilled} onClick={handleSubmit}>
          {allFilled ? 'Level up' : 'Save'}
        </SubmitWordsButton>
        <SubmitWordsButton
          onClick={onXClick}
          onMouseLeave={() => setIsConfirmPending(false)}
        >
          {isConfirmPending ? 'You sure?' : 'x'}
        </SubmitWordsButton>
      </ButtonsLine>
    </>
  );
};


import { Box } from '@mui/material'
import { FC, useState } from 'react';
import { NodeType, typedEntries, WordGroups, WordGroupsType, WordType } from '../../data';
import { AutotranslateButton, ButtonsLine, COLOUR_LANGUAGE_LEFT, COLOUR_LANGUAGE_RIGHT, LanguagesHeader, SubmitWordsButton, TextFieldWord, WordExample, WordGroup, WordGroupHeader, WordLine, WordTranslation } from './styles';
import { RetroSpinner } from '../RetroSpinner';

const REQUIRED_WORDS_PER_LEVEL: Record<WordGroupsType, number> = {
  nouns: 6,
  verbs: 3,
  adjectives: 3,
}

const makeInitWordGroup = (length: number) => 
  Array.from({ length }).map((_) => ({ translations: {english: "", swedish: "", french: ""}, examples: {}}));


export const WordAdd: FC<{ 
  nodeInFocus: NodeType;
  onCancelClick: () => void;
}> = ({ onCancelClick }) => {
  const [nouns, setNouns] = useState<WordType[]>(makeInitWordGroup(REQUIRED_WORDS_PER_LEVEL.nouns));
  const [ inputTouched, setInputTouched ] = useState(false);
  const [ isLoading, setIsLoading ] = useState(false);

  const handleChangeNoun = (i: number, language: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const nounsUpdated = nouns.map((noun, index) => (
      index !== i ? noun : {...noun, translations: { ...noun.translations, [language]: event.target.value }}
    ));
    setNouns(nounsUpdated);
    setInputTouched(true);
  }

  const autoTranslate = async () => {
    setIsLoading(true);

    try {
      const words = nouns.map(word => word.translations.english);

      const [responseSwedish, responseFrench] = await Promise.all([
        Promise.all(
          words.map(word =>
            word
              ? fetch(
                  `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|sv`
                )
              : null
          )
        ),
        Promise.all(
          words.map(word =>
            word
              ? fetch(
                  `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|fr`
                )
              : null
          )
        ),
      ]);

      const [dataSwedish, dataFrench] = await Promise.all([
        Promise.all(responseSwedish.map(item => (item ? item.json() : null))),
        Promise.all(responseFrench.map(item => (item ? item.json() : null))),
      ]);

      const nounsUpdated = nouns.map((noun, index) => ({
        ...noun,
        translations: {
          ...noun.translations,
          swedish: dataSwedish[index]?.responseData?.translatedText ?? "",
          french: dataFrench[index]?.responseData?.translatedText ?? "",
        },
      }));

      setInputTouched(false);
      setNouns(nounsUpdated);
    } finally {
      setIsLoading(false);
    }
  };

  const offerAutoTranslation = nouns.filter(word => !!word.translations.english).length !== 0 && inputTouched;
  const allFilled = nouns.filter(word => Object.values(word.translations).includes("")).length === 0;

  return (
    <>
      <LanguagesHeader>
        <span>French</span>
        <span>English {offerAutoTranslation && 
          <AutotranslateButton disabled={isLoading} onClick={autoTranslate}>
            {isLoading ? <>[AUTO <RetroSpinner />]</> : "[AUTO]"}
          </AutotranslateButton>}</span>
        <span>Swedish</span>
      </LanguagesHeader>
      {
        typedEntries(WordGroups).map(([key, label]) => {
          return (
          <WordGroup>
              <WordGroupHeader key={key}><span>{label} [{REQUIRED_WORDS_PER_LEVEL[key]}]</span></WordGroupHeader>
              {
                Array.from({ length: REQUIRED_WORDS_PER_LEVEL[key] }).map((_, index) => (
                  <WordLine key={`${key}_${index}`}>
                    <Box>
                      <WordTranslation color={COLOUR_LANGUAGE_LEFT}>
                        <TextFieldWord
                          id={`${key}_${index}_french_input`}
                          value={isLoading && !!nouns[index].translations.english ? "..." : nouns[index].translations.french}
                          variant="standard"
                          size="medium"
                          onChange={handleChangeNoun(index, "french")}
                          fullWidth
                        />
                      </WordTranslation>
                    </Box>
                    <Box>
                      <WordTranslation>
                        <TextFieldWord
                          id={`${key}_${index}_english_input`}
                          value={nouns[index].translations.english}
                          variant="standard"
                          size="medium"
                          onChange={handleChangeNoun(index, "english")}
                          fullWidth
                        />
                      </WordTranslation>
                    </Box>
                    <Box>
                      <WordTranslation color={COLOUR_LANGUAGE_RIGHT}>
                        <TextFieldWord
                          id={`${key}_${index}_swedish_input`}
                          value={isLoading && !!nouns[index].translations.english ? "..." : nouns[index].translations.swedish}
                          variant="standard"
                          size="medium"
                          onChange={handleChangeNoun(index, "swedish")}
                          fullWidth
                        />
                      </WordTranslation>
                    </Box>
                  </WordLine>
                ))
              }
            </WordGroup>
        )})
      }
      <ButtonsLine>
        <SubmitWordsButton disabled={!allFilled}>Level up</SubmitWordsButton>
        <SubmitWordsButton onClick={onCancelClick}>x</SubmitWordsButton>

      </ButtonsLine>
    </>
  )
}


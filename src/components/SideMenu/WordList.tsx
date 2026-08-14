
import { Box } from '@mui/material'
import { FC } from 'react';
import { NodeType, typedEntries, WordGroups } from '../../data';
import { COLOUR_LANGUAGE_LEFT, COLOUR_LANGUAGE_RIGHT, LanguagesHeader, NoWordsHint, WordExample, WordGroup, WordGroupHeader, WordLine, WordTranslation } from './styles';



export const WordList: FC<{ 
  nodeInFocus: NodeType;
}> = ({ nodeInFocus }) => {

  const totalAmount = Object.values(nodeInFocus.words).flat().length;

  return (
    <>
      {totalAmount !== 0 && (<LanguagesHeader>
        <span>French</span>
        <span>English</span>
        <span>Swedish</span>
      </LanguagesHeader>)}
      {
        totalAmount === 0 
          ? <NoWordsHint>Click the [+] button to level up and add words</NoWordsHint>
          : (
            typedEntries(WordGroups).map(([key, label]) => (
              nodeInFocus.words[key].length !== 0 && (
                <WordGroup>
                  <WordGroupHeader key={key}><span>{label} [{nodeInFocus?.words[key].length}]</span></WordGroupHeader>
                  {
                    nodeInFocus.words[key].map((word) => (
                      <WordLine key={`${word.translations.english}_${word.translations.french}_${word.translations.swedish}`}>
                        <Box>
                          <WordTranslation color={COLOUR_LANGUAGE_LEFT}>{word.translations.french}</WordTranslation>
                          {word.examples?.french && <WordExample>{word.examples.french}</WordExample>}
                        </Box>
                        <Box>
                          <WordTranslation>{word.translations.english}</WordTranslation>
                          {word.examples?.english && <WordExample>{word.examples.english}</WordExample>}
                        </Box>
                        <Box>
                          <WordTranslation color={COLOUR_LANGUAGE_RIGHT}>{word.translations.swedish}</WordTranslation>
                          {word.examples?.swedish && <WordExample>{word.examples.swedish}</WordExample>}
                        </Box>
                      </WordLine>
                    ))
                  }
                </WordGroup>
              )
            ))
          )
      }
    </>
  )
}


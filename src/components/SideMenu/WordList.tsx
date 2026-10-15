import { type FC } from 'react';
import { languageC, languageL, languageR, WordGroups } from '../../data';
import type { Language, MapNode } from '../../data';
import {
  ActionsPanel,
  languageColors,
  NoWordsHint,
  TextButton,
  WordCell,
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
  languagesVisible: Language[];
  onLanguageClick?: () => void;
  onZoomClick: (id: string | null) => void;
}> = ({ nodeInFocus, languagesVisible, onLanguageClick, onZoomClick }) => {
  const totalAmount = Object.values(nodeInFocus.words).flat().length;

  return (
    <>
      {totalAmount !== 0 && (
        <ActionsPanel>
          <TextButton
            hideOnDesktop={!!nodeInFocus.outerNodeId}
            onClick={() =>
              onZoomClick(nodeInFocus.outerNodeId ? null : nodeInFocus.id)
            }
          >
            {nodeInFocus.outerNodeId ? '<- ZOOM ->' : '+> ZOOM <+'}
          </TextButton>
        </ActionsPanel>
      )}
      {totalAmount !== 0 && (
        <LanguageHeader
          onLanguageClick={onLanguageClick}
          languageVisible={languagesVisible}
        />
      )}
      {totalAmount === 0 ? (
        <NoWordsHint>
          Click the [+] button to level up and add words
        </NoWordsHint>
      ) : (
        typedEntries(WordGroups).map(
          ([group, label]) =>
            nodeInFocus.words[group].length !== 0 && (
              <WordGroup key={`${group}_group`}>
                <WordGroupHeader key={group}>
                  <span>
                    {label} [{nodeInFocus?.words[group].length}]
                  </span>
                </WordGroupHeader>
                {nodeInFocus.words[group].map((word) => (
                  <WordLine
                    key={`${word.translations[languageC]}_${word.translations[languageL]}_${word.translations[languageR]}`}
                  >
                    {[languageL, languageC, languageR].map((language) => (
                      <WordCell
                        hidden={!languagesVisible.includes(language)}
                        key={`${language}_word`}
                      >
                        <WordTranslation color={languageColors[language]}>
                          {word.translations[language]}
                        </WordTranslation>
                        {word.examples?.[language] && (
                          <WordExample>{word.examples[language]}</WordExample>
                        )}
                      </WordCell>
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

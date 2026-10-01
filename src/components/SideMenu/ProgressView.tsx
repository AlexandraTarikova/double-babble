import { Box } from '@mui/material';
import { useMemo, useState, type FC } from 'react';
import { languageC, languageL, languageR, WordGroups } from '../../data';
import type { MapNode, ProgressMode } from '../../data';
import {
  ActionsPanel,
  COLOUR_DARK_MUTED,
  languageColors,
  NoWordsHint,
  TextButton,
  TrainingIndicator,
  TrainingIndicatorLine,
  WordGroup,
  WordGroupHeader,
  WordLine,
  WordTranslation,
} from './styles';
import { getWordKey, typedEntries } from '../../helpers';
import { LanguageHeader } from './LanguageHeader';
import { getWordStrengthList } from '../../storageStrength';

export const ProgressView: FC<{
  nodeInFocus: MapNode;
  onZoomClick: () => void;
}> = ({ nodeInFocus }) => {
  const [mode, setMode] = useState<ProgressMode>('general');
  const data = useMemo(() => getWordStrengthList() ?? {}, []);
  const totalAmount = Object.values(nodeInFocus.words).flat().length;

  return (
    <>
      {totalAmount !== 0 && (
        <ActionsPanel flexDirection={'row'}>
          {['general', 'errors', 'time'].map((item) => (
            <>
              <TextButton
                active={mode === item}
                disabled={item !== 'general'}
                onClick={() => setMode(item as ProgressMode)}
              >
                {item.toUpperCase()}
              </TextButton>
              {item !== 'time' && (
                <span style={{ color: COLOUR_DARK_MUTED }}>#</span>
              )}
            </>
          ))}
        </ActionsPanel>
      )}
      {totalAmount !== 0 && <LanguageHeader />}
      {totalAmount === 0 ? (
        <NoWordsHint>
          Click the [+] button to level up and add words
        </NoWordsHint>
      ) : (
        typedEntries(WordGroups).map(
          ([group, label]) =>
            nodeInFocus.words[group].length !== 0 && (
              <WordGroup key={`${group}_progress_node`}>
                <WordGroupHeader key={group}>
                  <span>
                    {label} [{nodeInFocus?.words[group].length}]
                  </span>
                </WordGroupHeader>
                {nodeInFocus.words[group].map((word) => (
                  <WordLine
                    key={`${word.translations[languageC]}_${word.translations[languageL]}_${word.translations[languageR]}`}
                  >
                    {[languageL, languageC, languageR].map((language) => {
                      const key = getWordKey({
                        from: languageC,
                        to: language,
                        word: word.translations[language],
                        group,
                      });
                      const strength = data[key];
                      return (
                        <Box>
                          <WordTranslation color={languageColors[language]}>
                            {word.translations[language]}
                          </WordTranslation>
                          {language !== languageC && (
                            <TrainingIndicatorLine>
                              {Array.from(
                                { length: 5 - (strength?.results.length ?? 0) },
                                () => {
                                  return (
                                    <TrainingIndicator value={null}>
                                      ◌
                                    </TrainingIndicator>
                                  );
                                },
                              )}
                              {strength?.results.slice(-5).map((value) => (
                                <TrainingIndicator value={value}>
                                  {value === -1 ? '◇' : '◆'}
                                </TrainingIndicator>
                              ))}
                            </TrainingIndicatorLine>
                          )}
                        </Box>
                      );
                    })}
                  </WordLine>
                ))}
              </WordGroup>
            ),
        )
      )}
    </>
  );
};

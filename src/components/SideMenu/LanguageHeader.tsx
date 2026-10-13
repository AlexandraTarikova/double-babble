import {
  languageC,
  languageL,
  languageR,
  Languages,
  type Language,
} from '../../data';
import {
  AutotranslateButton,
  languageColors,
  LanguageHeaderRoot,
  WordCell,
} from './styles';
import type { FC } from 'react';
import { RetroSpinner } from '../RetroSpinner';

export const LanguageHeader: FC<{
  onButtonClick?: () => void;
  onLanguageClick?: () => void;
  languageVisible?: Language[];
  disabled?: boolean;
  loading?: boolean;
}> = ({
  onButtonClick,
  onLanguageClick,
  languageVisible,
  disabled = false,
  loading = false,
}) => {
  const autoTranslate = async () => {
    if (onButtonClick) onButtonClick();
  };

  return (
    <LanguageHeaderRoot>
      <WordCell
        hidden={languageVisible && !languageVisible.includes(languageL)}
        color={languageColors[languageL]}
      >
        <button onClick={onLanguageClick}>
          {onLanguageClick && '<'} {Languages[languageL]}
        </button>
      </WordCell>
      <WordCell color={languageColors[languageC]}>
        {Languages[languageC]}{' '}
        {onButtonClick && (
          <AutotranslateButton
            disabled={disabled || loading}
            onClick={autoTranslate}
          >
            {loading ? (
              <>
                [AUTO <RetroSpinner />]
              </>
            ) : (
              '[AUTO]'
            )}
          </AutotranslateButton>
        )}
      </WordCell>
      <WordCell
        hidden={languageVisible && !languageVisible.includes(languageR)}
        color={languageColors[languageR]}
      >
        <button onClick={onLanguageClick}>
          {Languages[languageR]} {onLanguageClick && '>'}
        </button>
      </WordCell>
    </LanguageHeaderRoot>
  );
};

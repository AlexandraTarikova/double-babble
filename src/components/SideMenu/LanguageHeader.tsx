import { type Language, Languages } from '../../data';
import { AutotranslateButton, LanguageHeaderRoot } from './styles';
import type { FC } from 'react';
import { RetroSpinner } from '../RetroSpinner';

export const LanguageHeader: FC<{
  onButtonClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}> = ({ onButtonClick, disabled = false, loading = false }) => {
  const [languageL, languageC, languageR]: Language[] = [
    'french',
    'english',
    'swedish',
  ];

  const autoTranslate = async () => {
    if (onButtonClick) onButtonClick();
  };

  return (
    <LanguageHeaderRoot>
      <span>{Languages[languageL]}</span>
      <span>
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
      </span>
      <span>{Languages[languageR]}</span>
    </LanguageHeaderRoot>
  );
};

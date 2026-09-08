import { Box } from '@mui/material';
import type { FC } from 'react';

export const DebugPanel: FC<{}> = ({}) => {
  const onBoop = async () => {
    const text = 'friend';
    const langpair = 'en|sv';

    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`,
    );

    const data = await response.json();
    console.log(data.responseData.translatedText);
  };

  return (
    <Box position={'fixed'} top={0} left={0} zIndex={100}>
      <button onClick={onBoop}>boop</button>
    </Box>
  );
};

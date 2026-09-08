import { useEffect, useState } from 'react';
import type { FC } from 'react';

const values = ['\\', '|', '/', '-'];

export const RetroSpinner: FC = () => {
  const [currentI, setCurrentI] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentI((prev) => (prev + 1) % values.length);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return <>{values[currentI]}</>;
};

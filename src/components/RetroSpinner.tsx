import { FC, useEffect, useState } from 'react';


export const RetroSpinner: FC = () => {
  const values = ["\\", "|", "/", "-"];
  const [currentI, setCurrentI] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentI(prev => (prev + 1) % values.length);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return <>{values[currentI]}</>;
};

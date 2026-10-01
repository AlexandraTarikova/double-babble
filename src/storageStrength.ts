import type { WordStrengthList } from './data';

const KEY = 'wordStrength';

function isWordStrengthList(value: unknown): value is WordStrengthList {
  if (typeof value !== 'object') {
    return false;
  }
  return true;
}

export const getWordStrengthList = () => {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isWordStrengthList(parsed)) {
      return parsed;
    } else {
      throw new Error('Corrupt word strength list');
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const saveWordStrengthList = (newState: WordStrengthList) => {
  localStorage.setItem(KEY, JSON.stringify(newState));
};

export const setWordStrengthList = (newState?: WordStrengthList) => {
  if (newState) {
    localStorage.setItem(KEY, JSON.stringify(newState));
  } else {
    localStorage.removeItem(KEY);
  }
};

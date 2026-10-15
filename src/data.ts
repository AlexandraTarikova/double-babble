export const SideMenuMode = {
  initial: '',
  words: 'Words',
  levelUp: '',
  train: 'Train',
  edit: 'Edit',
  progress: 'Progress',
} as const;
export type SideMenuMode = keyof typeof SideMenuMode;

export const ProgressMode = {
  general: 'general',
  errors: 'errors',
  time: 'time,',
} as const;
export type ProgressMode = keyof typeof ProgressMode;

export const Languages = {
  swedish: 'Swedish',
  english: 'English',
  french: 'French',
} as const;

export type Language = keyof typeof Languages;

export type Word = {
  translations: Record<Language, string>;
  examples: Partial<Record<Language, string>>;
};
export const WordGroups = {
  nouns: 'Nouns',
  verbs: 'Verbs',
  adjectives: 'Adjectives',
} as const;

export type WordGroupsType = keyof typeof WordGroups;

export type WordStrength = {
  results: number[];
  lastCheck: Date;
};
export type WordStrengthList = Record<string, WordStrength>;

export const LinkDirections = ['N', 'E', 'S', 'W'] as const;

export type LinkDirectionType = (typeof LinkDirections)[number];

export type LinkIdsType = {
  [Direction in LinkDirectionType]: string | null;
};

export type MapNode = {
  id: string;
  title: string;
  words: Record<WordGroupsType, Word[]>;
  outerNodeId: null | string;
  linkIds: LinkIdsType;
};

export const [languageL, languageC, languageR]: Language[] = [
  'french',
  'english',
  'swedish',
];

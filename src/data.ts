export function typedEntries<T extends Record<string, unknown>>(obj: T) {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}

export type WordType = {
  translations: Record<string, string>;
  examples: Record<string, string>;
};
export const WordGroups = {
  nouns: 'Nouns',
  verbs: 'Verbs',
  adjectives: 'Adjectives',
} as const;

export type WordGroupsType = keyof typeof WordGroups;

export const LinkDirections = ['N', 'E', 'S', 'W'] as const;

export type LinkDirectionType = (typeof LinkDirections)[number];

export type LinkIdsType = {
  [Direction in LinkDirectionType]: string | null;
};

export type NodeType = {
  id: string;
  title: string;
  level: number;
  words: Record<WordGroupsType, WordType[]>;
  parentId: null | string;
  innerNodeIds: string[];
  linkIds: LinkIdsType;
};

const NOUNS_DEMO: WordType[] = [
  {
    translations: {
      english: 'grass',
      swedish: 'gräs',
      french: 'herbe',
    },
    examples: {
      english: 'Grass is green',
      swedish: 'Gräs är grönt',
      french: "L'herbe est verte",
    },
  },
  {
    translations: {
      english: 'a tree',
      swedish: 'ett träd',
      french: 'un arbre',
    },
    examples: {
      english: 'A tree grows slowly',
      swedish: 'Ett träd växer långsamt',
      french: 'Un arbre pousse lentement',
    },
  },
  {
    translations: {
      english: 'a bush',
      swedish: 'en buske',
      french: 'un buisson',
    },
    examples: {
      english: 'A bush is big',
      swedish: 'En buske är stor',
      french: 'Un buisson est grand',
    },
  },
  {
    translations: {
      english: 'a bird',
      swedish: 'en fågel',
      french: 'un oiseau',
    },
    examples: {
      english: 'I hear a bird',
      swedish: 'Jag hör en fågel',
      french: "J'entends un oiseau",
    },
  },
  {
    translations: {
      english: 'a deer',
      swedish: 'en hjort',
      french: 'un cerf',
    },
    examples: {
      english: 'A deer eats a mushroom',
      swedish: 'En hjort äter en svamp',
      french: 'Un cerf mange un champignon',
    },
  },
  {
    translations: {
      english: 'a mushroom',
      swedish: 'en svamp',
      french: 'un champignon',
    },
    examples: {
      english: 'A mushroom grows under a tree',
      swedish: 'En svamp växer under ett träd',
      french: 'Un champignon pousse sous un arbre',
    },
  },
];

const VERBS_DEMO: WordType[] = [
  {
    translations: {
      english: 'to walk',
      swedish: 'att gå',
      french: 'marcher',
    },
    examples: {
      english: 'I walk in the forest',
      swedish: 'Jag går i skogen',
      french: 'Je marche dans la forêt',
    },
  },
  {
    translations: {
      english: 'to grow',
      swedish: 'att växa',
      french: 'pousser',
    },
    examples: {
      english: 'Mushrooms grow fast',
      swedish: 'Svampar växer snabbt',
      french: 'Les champignons poussent vite',
    },
  },
  {
    translations: {
      english: 'to grow',
      swedish: 'att odla',
      french: 'cultiver',
    },
    examples: {
      english: 'I grow strawberries',
      swedish: 'Jag odlar jordgubbar',
      french: 'Je cultive des fraises',
    },
  },
  {
    translations: {
      english: 'to hunt',
      swedish: 'att jaga',
      french: 'chasser',
    },
    examples: {
      english: 'They hunt deer',
      swedish: 'De jagar rådjur',
      french: 'Ils chassent le cerf',
    },
  },
];

const ADJECTIVES_DEMO: WordType[] = [
  {
    translations: {
      english: 'green',
      swedish: 'grön',
      french: 'vert',
    },
    examples: {
      english: 'The forest is green',
      swedish: 'Skogen är grön',
      french: 'La forêt est verte',
    },
  },
  {
    translations: {
      english: 'small',
      swedish: 'liten',
      french: 'petit',
    },
    examples: {
      english: 'The bird is small',
      swedish: 'Fågeln är liten',
      french: "L'oiseau est petit",
    },
  },
  {
    translations: {
      english: 'big',
      swedish: 'stor',
      french: 'grand',
    },
    examples: {
      english: 'The tree is big',
      swedish: 'Trädet är stort',
      french: "L'arbre est grand",
    },
  },
  {
    translations: {
      english: 'quiet',
      swedish: 'tyst',
      french: 'calme',
    },
    examples: {
      english: 'The forest is quiet',
      swedish: 'Skogen är tyst',
      french: 'La forêt est calme',
    },
  },
  {
    translations: {
      english: 'wild',
      swedish: 'vild',
      french: 'sauvage',
    },
    examples: {
      english: 'The deer is wild',
      swedish: 'Hjorten är vild',
      french: 'Le cerf est sauvage',
    },
  },
];

export const NODES_DEMO: NodeType[] = [
  {
    id: 'forest',
    title: 'Forest',
    level: 15,
    words: {
      nouns: [
        {
          translations: {
            english: 'grass',
            swedish: 'gräs',
            french: 'herbe',
          },
          examples: {
            english: 'Grass is green',
            swedish: 'Gräs är grönt',
            french: "L'herbe est verte",
          },
        },
        {
          translations: {
            english: 'a tree',
            swedish: 'ett träd',
            french: 'un arbre',
          },
          examples: {
            english: 'A tree grows slowly',
            swedish: 'Ett träd växer långsamt',
            french: 'Un arbre pousse lentement',
          },
        },
        {
          translations: {
            english: 'a bush',
            swedish: 'en buske',
            french: 'un buisson',
          },
          examples: {
            english: 'A bush is big',
            swedish: 'En buske är stor',
            french: 'Un buisson est grand',
          },
        },
        {
          translations: {
            english: 'a bird',
            swedish: 'en fågel',
            french: 'un oiseau',
          },
          examples: {
            english: 'I hear a bird',
            swedish: 'Jag hör en fågel',
            french: "J'entends un oiseau",
          },
        },
        {
          translations: {
            english: 'a deer',
            swedish: 'en hjort',
            french: 'un cerf',
          },
          examples: {
            english: 'A deer eats a mushroom',
            swedish: 'En hjort äter en svamp',
            french: 'Un cerf mange un champignon',
          },
        },
        {
          translations: {
            english: 'a mushroom',
            swedish: 'en svamp',
            french: 'un champignon',
          },
          examples: {
            english: 'A mushroom grows under a tree',
            swedish: 'En svamp växer under ett träd',
            french: 'Un champignon pousse sous un arbre',
          },
        },
      ],
      verbs: [
        {
          translations: {
            english: 'to walk',
            swedish: 'att gå',
            french: 'marcher',
          },
          examples: {
            english: 'I walk in the forest',
            swedish: 'Jag går i skogen',
            french: 'Je marche dans la forêt',
          },
        },
        {
          translations: {
            english: 'to grow',
            swedish: 'att växa',
            french: 'pousser',
          },
          examples: {
            english: 'Mushrooms grow fast',
            swedish: 'Svampar växer snabbt',
            french: 'Les champignons poussent vite',
          },
        },
        {
          translations: {
            english: 'to grow',
            swedish: 'att odla',
            french: 'cultiver',
          },
          examples: {
            english: 'I grow strawberries',
            swedish: 'Jag odlar jordgubbar',
            french: 'Je cultive des fraises',
          },
        },
        {
          translations: {
            english: 'to hunt',
            swedish: 'att jaga',
            french: 'chasser',
          },
          examples: {
            english: 'They hunt deer',
            swedish: 'De jagar rådjur',
            french: 'Ils chassent le cerf',
          },
        },
      ],
      adjectives: [
        {
          translations: {
            english: 'green',
            swedish: 'grön',
            french: 'vert',
          },
          examples: {
            english: 'The forest is green',
            swedish: 'Skogen är grön',
            french: 'La forêt est verte',
          },
        },
        {
          translations: {
            english: 'small',
            swedish: 'liten',
            french: 'petit',
          },
          examples: {
            english: 'The bird is small',
            swedish: 'Fågeln är liten',
            french: "L'oiseau est petit",
          },
        },
        {
          translations: {
            english: 'big',
            swedish: 'stor',
            french: 'grand',
          },
          examples: {
            english: 'The tree is big',
            swedish: 'Trädet är stort',
            french: "L'arbre est grand",
          },
        },
        {
          translations: {
            english: 'quiet',
            swedish: 'tyst',
            french: 'calme',
          },
          examples: {
            english: 'The forest is quiet',
            swedish: 'Skogen är tyst',
            french: 'La forêt est calme',
          },
        },
        {
          translations: {
            english: 'wild',
            swedish: 'vild',
            french: 'sauvage',
          },
          examples: {
            english: 'The deer is wild',
            swedish: 'Hjorten är vild',
            french: 'Le cerf est sauvage',
          },
        },
      ],
    },
    parentId: null,
    innerNodeIds: [],
    linkIds: {
      N: 'road',
      E: 'village',
      S: null,
      W: 'mountains',
    },
  },
  {
    id: 'mountains',
    title: 'Mountains',
    level: 6,
    words: {
      nouns: NOUNS_DEMO,
      verbs: VERBS_DEMO,
      adjectives: ADJECTIVES_DEMO,
    },
    parentId: null,
    innerNodeIds: [],
    linkIds: {
      N: null,
      E: 'forest',
      S: null,
      W: null,
    },
  },
  {
    id: 'village',
    title: 'Village',
    level: 10,
    words: {
      nouns: [
        {
          translations: {
            english: 'a man',
            swedish: 'en man',
            french: 'un homme',
          },
          examples: {
            english: 'A man lives in the village',
            swedish: 'En man bor i byn',
            french: 'Un homme vit dans le village',
          },
        },
        {
          translations: {
            english: 'a woman',
            swedish: 'en kvinna',
            french: 'une femme',
          },
          examples: {
            english: 'A woman cooks food',
            swedish: 'En kvinna lagar mat',
            french: 'Une femme cuisine',
          },
        },
        {
          translations: {
            english: 'a child',
            swedish: 'ett barn',
            french: 'un enfant',
          },
          examples: {
            english: 'A child sleeps in the house',
            swedish: 'Ett barn sover i huset',
            french: 'Un enfant dort dans la maison',
          },
        },
        {
          translations: {
            english: 'a family',
            swedish: 'en familj',
            french: 'une famille',
          },
          examples: {
            english: 'A family lives on a farm',
            swedish: 'En familj bor på en gård',
            french: 'Une famille vit dans une ferme',
          },
        },
        {
          translations: {
            english: 'a house',
            swedish: 'ett hus',
            french: 'une maison',
          },
          examples: {
            english: 'The house is small',
            swedish: 'Huset är litet',
            french: 'La maison est petite',
          },
        },
        {
          translations: {
            english: 'a farm',
            swedish: 'en gård',
            french: 'une ferme',
          },
          examples: {
            english: 'The farm has animals',
            swedish: 'Gården har djur',
            french: 'La ferme a des animaux',
          },
        },
        {
          translations: {
            english: 'food',
            swedish: 'mat',
            french: 'la nourriture',
          },
          examples: {
            english: 'The food is good',
            swedish: 'Maten är god',
            french: 'La nourriture est bonne',
          },
        },
      ],
      verbs: [
        {
          translations: {
            english: 'to live',
            swedish: 'att bo',
            french: 'habiter',
          },
          examples: {
            english: 'They live in the village',
            swedish: 'De bor i byn',
            french: 'Ils habitent dans le village',
          },
        },
        {
          translations: {
            english: 'to cook',
            swedish: 'att laga mat',
            french: 'cuisiner',
          },
          examples: {
            english: 'I cook for my family',
            swedish: 'Jag lagar mat till min familj',
            french: 'Je cuisine pour ma famille',
          },
        },
        {
          translations: {
            english: 'to eat',
            swedish: 'att äta',
            french: 'manger',
          },
          examples: {
            english: 'We eat at home',
            swedish: 'Vi äter hemma',
            french: 'Nous mangeons à la maison',
          },
        },
        {
          translations: {
            english: 'to sleep',
            swedish: 'att sova',
            french: 'dormir',
          },
          examples: {
            english: 'The child sleeps at night',
            swedish: 'Barnet sover på natten',
            french: "L'enfant dort la nuit",
          },
        },
      ],
      adjectives: [
        {
          translations: {
            english: 'small',
            swedish: 'liten',
            french: 'petit',
          },
          examples: {
            english: 'The village is small',
            swedish: 'Byn är liten',
            french: 'Le village est petit',
          },
        },
        {
          translations: {
            english: 'big',
            swedish: 'stor',
            french: 'grand',
          },
          examples: {
            english: 'The family is big',
            swedish: 'Familjen är stor',
            french: 'La famille est grande',
          },
        },
        {
          translations: {
            english: 'warm',
            swedish: 'varm',
            french: 'chaud',
          },
          examples: {
            english: 'The food is warm',
            swedish: 'Maten är varm',
            french: 'La nourriture est chaude',
          },
        },
        {
          translations: {
            english: 'old',
            swedish: 'gammal',
            french: 'vieux',
          },
          examples: {
            english: 'The house is old',
            swedish: 'Huset är gammalt',
            french: 'La maison est vieille',
          },
        },
        {
          translations: {
            english: 'good',
            swedish: 'god',
            french: 'bon',
          },
          examples: {
            english: 'The food is good',
            swedish: 'Maten är god',
            french: 'La nourriture est bonne',
          },
        },
      ],
    },
    parentId: null,
    innerNodeIds: [],
    linkIds: {
      N: null,
      E: 'river',
      S: null,
      W: 'forest',
    },
  },
  {
    id: 'river',
    title: 'River',
    level: 6,
    words: {
      nouns: NOUNS_DEMO,
      verbs: VERBS_DEMO,
      adjectives: ADJECTIVES_DEMO,
    },
    parentId: null,
    innerNodeIds: [],
    linkIds: {
      N: null,
      E: null,
      S: 'sea',
      W: 'village',
    },
  },
  {
    id: 'sea',
    title: 'Sea',
    level: 1,
    words: {
      nouns: NOUNS_DEMO,
      verbs: VERBS_DEMO,
      adjectives: ADJECTIVES_DEMO,
    },
    parentId: null,
    innerNodeIds: [],
    linkIds: {
      N: 'river',
      E: null,
      S: null,
      W: null,
    },
  },
  {
    id: 'road',
    title: 'Road',
    level: 8,
    words: {
      nouns: NOUNS_DEMO,
      verbs: VERBS_DEMO,
      adjectives: ADJECTIVES_DEMO,
    },
    parentId: null,
    innerNodeIds: [],
    linkIds: {
      N: 'castle',
      E: null,
      S: 'forest',
      W: null,
    },
  },
  {
    id: 'castle',
    title: 'Castle',
    level: 1,
    words: {
      nouns: NOUNS_DEMO,
      verbs: VERBS_DEMO,
      adjectives: ADJECTIVES_DEMO,
    },
    parentId: null,
    innerNodeIds: [],
    linkIds: {
      N: null,
      E: null,
      S: 'road',
      W: null,
    },
  },
];

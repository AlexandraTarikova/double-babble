# Double Babble

A vocabulary-map game for learning two languages at once.

You build a map of places — a Forest, a Village, a Castle — and each place holds the words
that belong to it. Learning words is what makes the map grow: fill a place with enough nouns,
verbs and adjectives and it levels up; level it up enough and it can branch out into a new
neighbouring place. Places can also hold a small map of their own (a Cabin inside the Forest).

Every word is stored in three languages: the two you're learning, with English in the middle
as the pivot. Right now that's French / English / Swedish.

## What works

- **Map** — grow places in four directions; the layout is derived from how places are linked,
  so nodes never store coordinates.
- **Levels** — derived from word counts, in fixed batches per level, so you can't level up on
  nouns alone.
- **Adding words** — with an AUTO button that fills the two outer languages from the English
  one. It uses a free translation API as a placeholder, so results are rough.
- **Train** — hide the outer translations, reveal one, grade yourself.
- **Progress** — your last few grades per word.
- **Inner maps** — zoom into a place to see its own map, one level deep.
- **Mobile** — usable on tablets and phones, though designed for desktop first.

Everything is saved in `localStorage`, as a log of actions replayed on load. There's no
backend yet; adding one is the next step.

Unfinished: editing words, deleting named places, search, example sentences when adding words.

## Stack

React 19, TypeScript, Vite, MUI with Emotion. No router, no state library — state is a
`useReducer` whose actions are logged and replayed.

## Running it

```
npm install
npm run dev       # dev server
npm run build     # type-check + production build
npm run preview   # serve the production build
npm run lint
npm run prettier
```

A fresh start gives you a single empty place. To try it with data, open the debug panel
(`[+]` in the top-left corner, desktop only) and choose **Use demo**.

## About

A personal project, written by hand to learn React and TypeScript properly, and now to learn
backend development on top of it.
